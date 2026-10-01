import { and, eq, isNull, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { asaasWebhookEvents, subscriptions } from "@/lib/db/schema";
import type { SubscriptionEffect } from "@/lib/integrations/asaas/events";
import type { BillingPlanId } from "@/types/database";
import { parseExternalReference, PLANS } from "./plans";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Trava a linha de subscription do usuário durante o checkout — dois cliques
 * seguidos em "Assinar" não criam duas assinaturas no Asaas: o segundo
 * espera o primeiro gravar o asaas_subscription_id e o reaproveita.
 */
export async function lockSubscription(tx: Tx, userId: string) {
  const [row] = await tx
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .for("update")
    .limit(1);
  return row ?? null;
}

export async function saveAsaasIds(
  tx: Tx,
  userId: string,
  ids: {
    asaasCustomerId?: string;
    asaasSubscriptionId?: string | null;
    asaasPendingPaymentId?: string | null;
    plan?: BillingPlanId;
  },
) {
  await tx.update(subscriptions).set(ids).where(eq(subscriptions.userId, userId));
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

/** true = evento novo; false = já recebido antes (reentrega "at least once"). */
export async function recordEvent(input: {
  id: string;
  event: string;
  paymentId: string | null;
  asaasSubscriptionId: string | null;
  payload: unknown;
}): Promise<{ isNew: boolean; alreadyProcessed: boolean }> {
  const inserted = await db
    .insert(asaasWebhookEvents)
    .values(input)
    .onConflictDoNothing({ target: asaasWebhookEvents.id })
    .returning({ id: asaasWebhookEvents.id });
  if (inserted.length > 0) return { isNew: true, alreadyProcessed: false };

  const [existing] = await db
    .select({ processedAt: asaasWebhookEvents.processedAt })
    .from(asaasWebhookEvents)
    .where(eq(asaasWebhookEvents.id, input.id))
    .limit(1);
  return { isNew: false, alreadyProcessed: Boolean(existing?.processedAt) };
}

export async function markEvent(id: string, result: { userId: string | null; error: string | null }) {
  await db
    .update(asaasWebhookEvents)
    .set({ userId: result.userId, error: result.error, processedAt: result.error ? null : new Date() })
    .where(eq(asaasWebhookEvents.id, id));
}

/**
 * Dono do evento, do identificador mais forte para o mais fraco:
 * assinatura Asaas → cliente Asaas → externalReference (= nosso userId,
 * gravado no checkout). Não depende de o Asaas propagar externalReference
 * da assinatura para as cobranças.
 */
export async function findUserId(ref: {
  asaasSubscriptionId?: string | null;
  asaasCustomerId?: string | null;
  externalReference?: string | null;
}): Promise<string | null> {
  // externalReference = "<userId>|<plano>" (ou só o userId, formato antigo).
  const referenceUserId = parseExternalReference(ref.externalReference).userId;
  const conditions = [
    ref.asaasSubscriptionId ? eq(subscriptions.asaasSubscriptionId, ref.asaasSubscriptionId) : undefined,
    ref.asaasCustomerId ? eq(subscriptions.asaasCustomerId, ref.asaasCustomerId) : undefined,
    referenceUserId ? eq(subscriptions.userId, referenceUserId) : undefined,
  ].filter((c) => c !== undefined);
  if (conditions.length === 0) return null;

  const rows = await db
    .select({ userId: subscriptions.userId, subId: subscriptions.asaasSubscriptionId, cusId: subscriptions.asaasCustomerId })
    .from(subscriptions)
    .where(or(...conditions));

  const bySub = rows.find((r) => ref.asaasSubscriptionId && r.subId === ref.asaasSubscriptionId);
  const byCus = rows.find((r) => ref.asaasCustomerId && r.cusId === ref.asaasCustomerId);
  return (bySub ?? byCus ?? rows[0])?.userId ?? null;
}

/**
 * Aplica o efeito. Regras:
 * - `revoked` é decisão do master e NUNCA é sobrescrita por webhook.
 * - efeitos negativos só na assinatura Asaas atual do usuário.
 * - pagamento confirmado grava o id da assinatura se ainda não havia.
 * - o timestamp do Asaas impede que um evento antigo reverta o estado novo.
 * Retorna quantas linhas mudaram (0 = efeito não se aplicava).
 */
export async function applyEffect(
  userId: string,
  effect: Extract<SubscriptionEffect, { kind: "set_status" }>,
  eventSubscriptionId: string | null,
  eventCreatedAt: Date,
  paidPlan: BillingPlanId | null = null,
): Promise<number> {
  const rows = await db
    .update(subscriptions)
    .set({
      status: effect.status,
      lastAsaasEventAt: eventCreatedAt,
      ...(effect.currentPeriodEnd && { currentPeriodEnd: new Date(effect.currentPeriodEnd) }),
      // Pagou de novo → desiste do cancelamento pedido antes.
      ...(effect.status === "active" && { cancelRequestedAt: null, cancelReason: null, cancelReasonNote: null }),
      // Plano pago define se renova: fundador é pagamento único.
      ...(effect.status === "active" && paidPlan && {
        plan: paidPlan,
        autoRenew: PLANS[paidPlan].recurring,
        asaasPendingPaymentId: null,
      }),
      ...(effect.status === "active" &&
        eventSubscriptionId && {
          asaasSubscriptionId: sql`coalesce(${subscriptions.asaasSubscriptionId}, ${eventSubscriptionId})`,
        }),
    })
    .where(
      and(
        eq(subscriptions.userId, userId),
        ne(subscriptions.status, "revoked"),
        effect.respectsPendingCancellation
          ? or(
              isNull(subscriptions.cancelRequestedAt),
              isNull(subscriptions.currentPeriodEnd),
              lte(subscriptions.currentPeriodEnd, sql`now()`),
            )
          : undefined,
        or(isNull(subscriptions.lastAsaasEventAt), lte(subscriptions.lastAsaasEventAt, eventCreatedAt)),
        !effect.requireCurrentSubscription && eventSubscriptionId
          ? or(isNull(subscriptions.asaasSubscriptionId), eq(subscriptions.asaasSubscriptionId, eventSubscriptionId))
          : undefined,
        effect.requireCurrentSubscription
          ? eventSubscriptionId
            ? eq(subscriptions.asaasSubscriptionId, eventSubscriptionId)
            : isNull(subscriptions.asaasSubscriptionId)
          : undefined,
      ),
    )
    .returning({ userId: subscriptions.userId });
  return rows.length;
}

/** Plano gravado no checkout e status atual (antes de aplicar o evento). */
export async function getStoredState(userId: string): Promise<{ plan: BillingPlanId | null; status: string | null }> {
  const [row] = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return { plan: (row?.plan as BillingPlanId | null) ?? null, status: row?.status ?? null };
}

/** Vagas de fundador já vendidas (pagamento confirmado). */
export async function countFounders(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(and(eq(subscriptions.plan, "fundador"), eq(subscriptions.autoRenew, false), eq(subscriptions.status, "active")));
  return row?.n ?? 0;
}
