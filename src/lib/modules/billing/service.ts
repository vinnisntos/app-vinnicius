import { getAccessStatus } from "@/lib/access/status";
import { ApiHttpError } from "@/lib/api/handler";
import { db } from "@/lib/db/client";
import { getTodayIsoDate } from "@/lib/date";
import { asaas, AsaasError, isAsaasConfigured } from "@/lib/integrations/asaas/client";
import { asaasEventTime, mapAsaasEvent, type AsaasWebhookPayload } from "@/lib/integrations/asaas/events";
import { track } from "@/lib/modules/analytics/track";
import { getAppSettings, getProfile } from "@/lib/modules/conta/repository";
import type { BillingPlan, BillingPlanId, CheckoutResponse, PlansResponse } from "@/types/database";
import { buildExternalReference, monthlyEquivalent, parseExternalReference, periodEndFor, PLAN_IDS, PLANS } from "./plans";
import * as repository from "./repository";
import type { CheckoutInput } from "./schema";

const OPEN_PAYMENT = new Set(["PENDING", "OVERDUE", "AWAITING_RISK_ANALYSIS"]);

async function firstOpenInvoiceUrl(subscriptionId: string): Promise<string | null> {
  const payments = await asaas.listSubscriptionPayments(subscriptionId);
  return payments.find((p) => OPEN_PAYMENT.has(p.status))?.invoiceUrl ?? null;
}

async function founderSeatsLeft(): Promise<number> {
  const [settings, sold] = await Promise.all([getAppSettings(), repository.countFounders()]);
  return Math.max(0, (settings?.founderSeatsTotal ?? 0) - sold);
}

/** Vitrine de planos (landing e tela de assinatura). */
export async function listPlans(): Promise<PlansResponse> {
  const [settings, seatsLeft] = await Promise.all([getAppSettings(), founderSeatsLeft()]);
  const plans: BillingPlan[] = PLAN_IDS.map((id) => {
    const plan = PLANS[id];
    return {
      id,
      name: plan.name,
      price: plan.price,
      months: plan.months,
      recurring: plan.recurring,
      pix_only: plan.pixOnly,
      monthly_equivalent: monthlyEquivalent(plan),
      seats_left: plan.limitedSeats ? seatsLeft : null,
    };
  });
  return { plans, trial_days: settings?.trialDays ?? 7 };
}

/**
 * Gera (ou reaproveita) a cobrança do plano escolhido e devolve a página de
 * pagamento do Asaas. Liberação do acesso acontece no webhook, nunca aqui.
 *
 * - mensal/anual: assinatura recorrente (Pix, boleto ou cartão).
 * - fundador: cobrança avulsa no Pix, vagas limitadas, não renova.
 *
 * Sem Asaas configurado → link fixo de app_settings.asaas_checkout_url
 * (liberação manual pelo master no painel).
 */
export async function startCheckout(userId: string, input: CheckoutInput): Promise<CheckoutResponse> {
  const planId: BillingPlanId = input.plan;
  const plan = PLANS[planId];

  const access = await getAccessStatus(userId);
  if (access.access_state === "active" || access.access_state === "master") {
    throw new ApiHttpError(409, "conflict", "Sua assinatura já está ativa.");
  }
  // Revogação é decisão do master e o webhook não a desfaz — deixar pagar
  // aqui cobraria alguém que continuaria bloqueado.
  if (access.access_state === "revoked") {
    throw new ApiHttpError(403, "forbidden", "Seu acesso foi suspenso. Fale com o suporte.");
  }
  if (plan.limitedSeats && (await founderSeatsLeft()) <= 0) {
    throw new ApiHttpError(409, "conflict", "As vagas do plano fundador acabaram. Escolha o plano mensal ou anual.");
  }

  if (!isAsaasConfigured()) {
    const settings = await getAppSettings();
    if (settings?.asaasCheckoutUrl) return { checkout_url: settings.asaasCheckoutUrl };
    throw new ApiHttpError(502, "upstream", "Pagamento indisponível no momento. Fale com o suporte.");
  }

  // Transações curtas, cada uma confirmando o efeito externo que produziu:
  // se a 2ª etapa falhar, o cliente Asaas criado na 1ª já está gravado e o
  // retry não o duplica. O FOR UPDATE serializa cliques concorrentes.
  try {
    await db.transaction(async (tx) => {
      const sub = await repository.lockSubscription(tx, userId);
      if (!sub) throw new ApiHttpError(404, "not_found", "Assinatura não encontrada.");
      if (sub.asaasCustomerId) return;

      if (!input.cpf) {
        throw new ApiHttpError(422, "validation", "Informe o CPF para emitir a cobrança.", {
          cpf: ["Informe o CPF para emitir a cobrança."],
        });
      }
      const profile = await getProfile(userId);
      const customer = await asaas.createCustomer({
        name: profile?.fullName || profile?.email || "Assinante",
        cpfCnpj: input.cpf,
        email: profile?.email,
        mobilePhone: profile?.phone,
        externalReference: userId,
      });
      await repository.saveAsaasIds(tx, userId, { asaasCustomerId: customer.id });
    });

    const url = await db.transaction(async (tx) => {
      const sub = await repository.lockSubscription(tx, userId);
      if (!sub?.asaasCustomerId) throw new ApiHttpError(409, "conflict", "Tente novamente.");
      const reference = buildExternalReference(userId, planId);

      // ---- Fundador: cobrança avulsa no Pix ----
      if (!plan.recurring) {
        if (sub.plan === planId && sub.asaasPendingPaymentId) {
          const pending = await asaas.getPayment(sub.asaasPendingPaymentId).catch(() => null);
          if (pending && OPEN_PAYMENT.has(pending.status)) return pending.invoiceUrl;
        }
        // Trocou de plano: encerra a assinatura recorrente pendente, se houver.
        if (sub.asaasSubscriptionId) {
          await asaas.cancelSubscription(sub.asaasSubscriptionId).catch(() => undefined);
        }
        const payment = await asaas.createPayment({
          customer: sub.asaasCustomerId,
          billingType: "PIX",
          value: plan.price,
          dueDate: getTodayIsoDate(),
          description: plan.description,
          externalReference: reference,
        });
        await repository.saveAsaasIds(tx, userId, {
          plan: planId,
          asaasPendingPaymentId: payment.id,
          asaasSubscriptionId: null,
        });
        return payment.invoiceUrl;
      }

      // ---- Mensal/anual: assinatura recorrente ----
      // Reaproveita a tentativa anterior só se for do MESMO plano.
      if (sub.asaasSubscriptionId && sub.plan === planId) {
        const open = await firstOpenInvoiceUrl(sub.asaasSubscriptionId);
        if (open) return open;
      }
      if (sub.asaasSubscriptionId) {
        // Plano diferente (ou sem cobrança aberta): não deixa duas
        // assinaturas cobrando a mesma pessoa.
        await asaas.cancelSubscription(sub.asaasSubscriptionId).catch(() => undefined);
      }
      if (sub.asaasPendingPaymentId) {
        // Desistiu do fundador antes de pagar: remove o Pix em aberto para
        // ele não ser pago depois, por engano, junto com a assinatura.
        await asaas.deletePayment(sub.asaasPendingPaymentId).catch(() => undefined);
      }
      const subscription = await asaas.createSubscription({
        customer: sub.asaasCustomerId,
        billingType: "UNDEFINED",
        value: plan.price,
        nextDueDate: getTodayIsoDate(),
        cycle: plan.asaasCycle!,
        description: plan.description,
        externalReference: reference,
      });
      await repository.saveAsaasIds(tx, userId, {
        plan: planId,
        asaasSubscriptionId: subscription.id,
        asaasPendingPaymentId: null,
      });
      return firstOpenInvoiceUrl(subscription.id);
    });

    if (!url) {
      throw new ApiHttpError(502, "upstream", "Cobrança criada, mas o link ainda não está pronto. Tente de novo em instantes.");
    }
    return { checkout_url: url };
  } catch (error) {
    if (error instanceof AsaasError) {
      console.error("[asaas] checkout", error.status, error.errors);
      // 400 do Asaas é quase sempre dado do pagador (CPF recusado etc.).
      if (error.status === 400) {
        throw new ApiHttpError(422, "validation", error.message, { cpf: [error.message] });
      }
      throw new ApiHttpError(502, "upstream", "O provedor de pagamento não respondeu. Tente novamente.");
    }
    throw error;
  }
}

export type WebhookOutcome =
  | { status: "duplicate" }
  | { status: "ignored"; reason: string }
  | { status: "applied"; userId: string; changed: number }
  | { status: "unmatched" };

/**
 * Processa um evento já autenticado. Idempotente pelo id do evento: reentrega
 * de evento já processado é no-op; evento que falhou antes é reprocessado.
 * Exceções propagam → rota responde 500 → Asaas reenvia.
 */
export async function processWebhook(payload: AsaasWebhookPayload): Promise<WebhookOutcome> {
  const subscriptionId = payload.payment?.subscription ?? payload.subscription?.id ?? null;
  const { alreadyProcessed } = await repository.recordEvent({
    id: payload.id,
    event: payload.event,
    paymentId: payload.payment?.id ?? null,
    asaasSubscriptionId: subscriptionId,
    payload,
  });
  if (alreadyProcessed) return { status: "duplicate" };

  const effect = mapAsaasEvent(payload);
  // Cobrança avulsa (fundador) que venceu sem pagamento não dá nem tira
  // acesso: quem está no teste grátis continua no teste.
  if (payload.event === "PAYMENT_OVERDUE" && payload.payment && !payload.payment.subscription) {
    await repository.markEvent(payload.id, { userId: null, error: null });
    return { status: "ignored", reason: "cobrança avulsa vencida" };
  }
  if (effect.kind === "ignore") {
    await repository.markEvent(payload.id, { userId: null, error: null });
    return { status: "ignored", reason: effect.reason };
  }

  const externalReference = payload.payment?.externalReference ?? payload.subscription?.externalReference;
  const userId = await repository.findUserId({
    asaasSubscriptionId: subscriptionId,
    asaasCustomerId: payload.payment?.customer ?? payload.subscription?.customer,
    externalReference,
  });
  if (!userId) {
    // Não é erro transitório: reenviar não vai achar o usuário. Registra e
    // responde 200 para não travar a fila do Asaas.
    await repository.markEvent(payload.id, { userId: null, error: "usuário não encontrado" });
    return { status: "unmatched" };
  }

  // Plano pago: o que veio na referência da cobrança (fundador é cobrança
  // avulsa, sem assinatura) ou, para recorrentes, o gravado no checkout.
  let paidPlan: BillingPlanId | null = null;
  let wasActive = false;
  if (effect.status === "active") {
    const stored = await repository.getStoredState(userId);
    wasActive = stored.status === "active";
    paidPlan = parseExternalReference(externalReference).plan ?? stored.plan ?? "mensal";
    if (payload.payment?.dueDate) effect.currentPeriodEnd = periodEndFor(payload.payment.dueDate, paidPlan);
  }

  const eventCreatedAt = asaasEventTime(payload);
  const changed = await repository.applyEffect(userId, effect, subscriptionId, eventCreatedAt, paidPlan);
  await repository.markEvent(payload.id, { userId, error: null });
  // Só a PRIMEIRA ativação conta como venda no funil — renovação não.
  if (changed > 0 && paidPlan && !wasActive) await track(userId, "subscribed", { plan: paidPlan });
  return { status: "applied", userId, changed };
}
