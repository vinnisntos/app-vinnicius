import type { BillingPlanId } from "@/types/database";

/**
 * Catálogo de planos — fonte única de preço e período (checkout, webhook,
 * landing e tela de assinatura leem daqui). Valores definidos pelo dono do
 * produto em 2026-10-01 (roadmap, Fase 0).
 *
 * - mensal:   assinatura recorrente no Asaas (Pix, boleto ou cartão)
 * - anual:    assinatura recorrente anual
 * - fundador: pagamento ÚNICO no Pix, vale 12 meses, não renova,
 *             vagas limitadas (app_settings.founder_seats_total)
 */
export interface PlanDefinition {
  id: BillingPlanId;
  name: string;
  price: number; // reais
  /** Meses de acesso que cada pagamento compra. */
  months: number;
  /** false = pagamento único (sem renovação automática). */
  recurring: boolean;
  asaasCycle: "MONTHLY" | "YEARLY" | null;
  /** Pagamento só por Pix (à vista). */
  pixOnly: boolean;
  limitedSeats: boolean;
  description: string;
}

export const PLANS: Record<BillingPlanId, PlanDefinition> = {
  mensal: {
    id: "mensal",
    name: "Mensal",
    price: 19.9,
    months: 1,
    recurring: true,
    asaasCycle: "MONTHLY",
    pixOnly: false,
    limitedSeats: false,
    description: "Life OS — assinatura mensal",
  },
  anual: {
    id: "anual",
    name: "Anual",
    price: 149,
    months: 12,
    recurring: true,
    asaasCycle: "YEARLY",
    pixOnly: false,
    limitedSeats: false,
    description: "Life OS — assinatura anual",
  },
  fundador: {
    id: "fundador",
    name: "Fundador",
    price: 67,
    months: 12,
    recurring: false,
    asaasCycle: null,
    pixOnly: true,
    limitedSeats: true,
    description: "Life OS — plano fundador (12 meses)",
  },
};

export const PLAN_IDS = Object.keys(PLANS) as BillingPlanId[];

/** Preço por mês equivalente — para ancorar a comparação na vitrine. */
export function monthlyEquivalent(plan: PlanDefinition): number {
  return Math.round((plan.price / plan.months) * 100) / 100;
}

/** "2026-01-31" + N meses → fim de mês não transborda (31/01 + 1 = 28/02). */
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const zeroBased = m - 1 + months;
  const year = y + Math.floor(zeroBased / 12);
  const month = (zeroBased % 12) + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

/** Fim do período pago: vencimento + meses do plano, 23:59 de Brasília. */
export function periodEndFor(dueDate: string, plan: BillingPlanId): string {
  return `${addMonths(dueDate, PLANS[plan].months)}T23:59:59-03:00`;
}

/**
 * externalReference enviado ao Asaas: "<userId>|<plano>". O plano vai junto
 * porque a cobrança avulsa do fundador não tem assinatura para consultar.
 */
export function buildExternalReference(userId: string, plan: BillingPlanId): string {
  return `${userId}|${plan}`;
}

export function parseExternalReference(ref: string | null | undefined): { userId: string | null; plan: BillingPlanId | null } {
  if (!ref) return { userId: null, plan: null };
  const [userId, plan] = ref.split("|");
  return {
    userId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) ? userId : null,
    plan: plan && plan in PLANS ? (plan as BillingPlanId) : null,
  };
}
