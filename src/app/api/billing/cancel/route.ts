import { ApiHttpError, apiRoute } from "@/lib/api/handler";
import { cancelSchema } from "@/lib/modules/billing/schema";
import { cancelSubscription } from "@/lib/modules/conta/self-service";
import type { CancelSubscriptionResponse } from "@/types/database";

/**
 * POST /api/billing/cancel — body `CancelSubscriptionRequest` ({ reason?, note? }),
 * opcional. Cancela a cobrança recorrente; acesso segue até o fim do período
 * pago. 409 sem assinatura ativa · 502 provedor.
 */
export const POST = apiRoute(
  { guard: "user" },
  async ({ userId, request }): Promise<CancelSubscriptionResponse> => {
    const raw = await request.text();
    let json: unknown = {};
    if (raw.trim()) {
      try {
        json = JSON.parse(raw);
      } catch {
        throw new ApiHttpError(400, "validation", "JSON inválido.");
      }
    }
    return cancelSubscription(userId, cancelSchema.parse(json));
  },
);
