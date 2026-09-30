import { apiRoute } from "@/lib/api/handler";
import { cancelSubscription } from "@/lib/modules/conta/self-service";
import type { CancelSubscriptionResponse } from "@/types/database";

/**
 * POST /api/billing/cancel — cancela a cobrança recorrente; acesso segue
 * até o fim do período pago. 409 sem assinatura ativa · 502 provedor.
 */
export const POST = apiRoute(
  { guard: "user" },
  async ({ userId }): Promise<CancelSubscriptionResponse> => cancelSubscription(userId),
);
