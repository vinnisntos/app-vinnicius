import { z } from "zod";
import type { SubscriptionStatus } from "@/types/database";

/**
 * Tradução pura "evento Asaas → efeito na nossa subscription". Sem I/O —
 * testável isoladamente (events.test.ts). O Asaas entrega "at least once",
 * então o efeito precisa ser idempotente: aplicar duas vezes = aplicar uma.
 */

export const asaasWebhookSchema = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  dateCreated: z.string().optional(),
  payment: z
    .object({
      id: z.string(),
      customer: z.string(),
      subscription: z.string().nullish(),
      status: z.string().optional(),
      dueDate: z.string().optional(),
      externalReference: z.string().nullish(),
    })
    .passthrough()
    .optional(),
  subscription: z
    .object({
      id: z.string(),
      customer: z.string(),
      externalReference: z.string().nullish(),
    })
    .passthrough()
    .optional(),
});
export type AsaasWebhookPayload = z.infer<typeof asaasWebhookSchema>;

export function asaasEventTime(payload: AsaasWebhookPayload, receivedAt = new Date()): Date {
  const parsed = payload.dateCreated ? new Date(payload.dateCreated) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : receivedAt;
}

export type SubscriptionEffect =
  | { kind: "ignore"; reason: string }
  | {
      kind: "set_status";
      status: Extract<SubscriptionStatus, "active" | "past_due" | "canceled">;
      /** Só nos pagamentos confirmados: vencimento + 1 ciclo (mensal). */
      currentPeriodEnd?: string;
      /**
       * Efeitos negativos só valem para a assinatura Asaas ATUAL do usuário —
       * atraso/cancelamento de uma assinatura antiga não derruba a nova.
       */
      requireCurrentSubscription: boolean;
      /**
       * Fim de assinatura (SUBSCRIPTION_DELETED/INACTIVATED) NÃO corta o
       * acesso de quem pediu cancelamento: vale até current_period_end.
       * Estorno/chargeback cortam na hora (o dinheiro voltou).
       */
      respectsPendingCancellation?: boolean;
    };

const PAID = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const REVERSED = new Set(["PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED"]);
const SUBSCRIPTION_ENDED = new Set(["SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED"]);

/** "2026-01-31" + 1 mês → "2026-02-28" (fim de mês não transborda). */
export function addOneMonth(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const targetMonth = m === 12 ? 1 : m + 1;
  const targetYear = m === 12 ? y + 1 : y;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function mapAsaasEvent(payload: AsaasWebhookPayload): SubscriptionEffect {
  const { event, payment } = payload;

  if (PAID.has(event)) {
    if (!payment?.dueDate) return { kind: "ignore", reason: "pagamento sem dueDate" };
    return {
      kind: "set_status",
      status: "active",
      // Fim do período pago = próximo vencimento, às 23:59 de Brasília.
      currentPeriodEnd: `${addOneMonth(payment.dueDate)}T23:59:59-03:00`,
      requireCurrentSubscription: false,
    };
  }
  if (event === "PAYMENT_OVERDUE") {
    return { kind: "set_status", status: "past_due", requireCurrentSubscription: true };
  }
  if (SUBSCRIPTION_ENDED.has(event)) {
    return { kind: "set_status", status: "canceled", requireCurrentSubscription: true, respectsPendingCancellation: true };
  }
  if (REVERSED.has(event)) {
    return { kind: "set_status", status: "canceled", requireCurrentSubscription: true };
  }
  return { kind: "ignore", reason: `evento ${event} não afeta acesso` };
}
