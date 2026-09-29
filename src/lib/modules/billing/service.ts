import { getAccessStatus } from "@/lib/access/status";
import { ApiHttpError } from "@/lib/api/handler";
import { db } from "@/lib/db/client";
import { getTodayIsoDate } from "@/lib/date";
import { asaas, AsaasError, getAsaasPlan, isAsaasConfigured } from "@/lib/integrations/asaas/client";
import { mapAsaasEvent, type AsaasWebhookPayload } from "@/lib/integrations/asaas/events";
import { getAppSettings, getProfile } from "@/lib/modules/conta/repository";
import type { CheckoutResponse } from "@/types/database";
import * as repository from "./repository";
import type { CheckoutInput } from "./schema";

const OPEN_PAYMENT = new Set(["PENDING", "OVERDUE", "AWAITING_RISK_ANALYSIS"]);

async function firstOpenInvoiceUrl(subscriptionId: string): Promise<string | null> {
  const payments = await asaas.listSubscriptionPayments(subscriptionId);
  return payments.find((p) => OPEN_PAYMENT.has(p.status))?.invoiceUrl ?? null;
}

/**
 * Gera (ou reaproveita) a cobrança do usuário e devolve a página de
 * pagamento do Asaas (Pix/boleto/cartão — billingType UNDEFINED deixa o
 * pagador escolher). Liberação do acesso acontece no webhook, nunca aqui.
 *
 * Sem Asaas configurado → cai no link fixo de app_settings.asaas_checkout_url
 * (liberação manual pelo master no painel).
 */
export async function startCheckout(userId: string, input: CheckoutInput): Promise<CheckoutResponse> {
  const access = await getAccessStatus(userId);
  if (access.access_state === "active" || access.access_state === "master") {
    throw new ApiHttpError(409, "conflict", "Sua assinatura já está ativa.");
  }
  // Revogação é decisão do master e o webhook não a desfaz — deixar pagar
  // aqui cobraria alguém que continuaria bloqueado.
  if (access.access_state === "revoked") {
    throw new ApiHttpError(403, "forbidden", "Seu acesso foi suspenso. Fale com o suporte.");
  }

  if (!isAsaasConfigured()) {
    const settings = await getAppSettings();
    if (settings?.asaasCheckoutUrl) return { checkout_url: settings.asaasCheckoutUrl };
    throw new ApiHttpError(502, "upstream", "Pagamento indisponível no momento. Fale com o suporte.");
  }

  // Duas transações curtas, cada uma confirmando o efeito externo que
  // produziu: se a 2ª etapa falhar, o cliente Asaas criado na 1ª já está
  // gravado e o retry não o duplica. O FOR UPDATE serializa cliques
  // concorrentes do mesmo usuário.
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

    const subscriptionId = await db.transaction(async (tx) => {
      const sub = await repository.lockSubscription(tx, userId);
      if (!sub?.asaasCustomerId) throw new ApiHttpError(409, "conflict", "Tente novamente.");

      // Reaproveita a assinatura de uma tentativa anterior se ainda houver
      // cobrança em aberto.
      if (sub.asaasSubscriptionId && (await firstOpenInvoiceUrl(sub.asaasSubscriptionId))) {
        return sub.asaasSubscriptionId;
      }

      const plan = getAsaasPlan();
      const subscription = await asaas.createSubscription({
        customer: sub.asaasCustomerId,
        billingType: "UNDEFINED",
        value: plan.value,
        nextDueDate: getTodayIsoDate(),
        cycle: plan.cycle,
        description: plan.description,
        externalReference: userId,
      });
      await repository.saveAsaasIds(tx, userId, { asaasSubscriptionId: subscription.id });
      return subscription.id;
    });

    const url = await firstOpenInvoiceUrl(subscriptionId);
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
  if (effect.kind === "ignore") {
    await repository.markEvent(payload.id, { userId: null, error: null });
    return { status: "ignored", reason: effect.reason };
  }

  const userId = await repository.findUserId({
    asaasSubscriptionId: subscriptionId,
    asaasCustomerId: payload.payment?.customer ?? payload.subscription?.customer,
    externalReference: payload.payment?.externalReference ?? payload.subscription?.externalReference,
  });
  if (!userId) {
    // Não é erro transitório: reenviar não vai achar o usuário. Registra e
    // responde 200 para não travar a fila do Asaas.
    await repository.markEvent(payload.id, { userId: null, error: "usuário não encontrado" });
    return { status: "unmatched" };
  }

  const changed = await repository.applyEffect(userId, effect, subscriptionId);
  await repository.markEvent(payload.id, { userId, error: null });
  return { status: "applied", userId, changed };
}
