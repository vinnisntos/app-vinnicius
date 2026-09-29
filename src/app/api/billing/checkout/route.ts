import { ApiHttpError, apiRoute } from "@/lib/api/handler";
import { checkoutSchema } from "@/lib/modules/billing/schema";
import { startCheckout } from "@/lib/modules/billing/service";
import type { CheckoutResponse } from "@/types/database";

/**
 * POST /api/billing/checkout — body `CheckoutRequest` ({ cpf? }), opcional.
 * guard "user": quem está com trial expirado precisa conseguir pagar.
 * 409 já assinante · 422 `fields.cpf` · 502 provedor indisponível.
 */
export const POST = apiRoute(
  { guard: "user", help: ["route.assinar"] },
  async ({ userId, request }): Promise<CheckoutResponse> => {
    const raw = await request.text();
    let json: unknown = {};
    if (raw.trim()) {
      try {
        json = JSON.parse(raw);
      } catch {
        throw new ApiHttpError(400, "validation", "JSON inválido.");
      }
    }
    return startCheckout(userId, checkoutSchema.parse(json));
  },
);
