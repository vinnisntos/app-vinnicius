import { db } from "@/lib/db/client";
import { analyticsEvents } from "@/lib/db/schema";
import type { BillingPlanId, CancelReason } from "@/types/database";

/**
 * Eventos de medição do funil — internos (tabela própria, sem ferramenta de
 * terceiros) e SEM dado de saúde. As propriedades aceitas são fechadas por
 * tipo: não há como gravar dose, peso, alimento ou sintoma por aqui.
 */
type EventProperties = {
  signup: { utm_source?: string; utm_medium?: string; utm_campaign?: string; medication_status?: string };
  meal_logged: Record<string, never>;
  medication_logged: Record<string, never>;
  subscribed: { plan: BillingPlanId };
  subscription_canceled: { reason?: CancelReason };
};

export type AnalyticsEvent = keyof EventProperties;

/**
 * Nunca lança: medição não pode derrubar a ação do usuário (registrar uma
 * refeição tem de funcionar mesmo se o insert do evento falhar).
 */
export async function track<E extends AnalyticsEvent>(
  userId: string | null,
  event: E,
  properties: EventProperties[E] = {} as EventProperties[E],
): Promise<void> {
  try {
    await db.insert(analyticsEvents).values({ userId, event, properties });
  } catch (error) {
    console.error("[analytics]", event, error);
  }
}
