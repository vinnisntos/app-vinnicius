import { apiRoute } from "@/lib/api/handler";
import { listPlans } from "@/lib/modules/billing/service";
import type { PlansResponse } from "@/types/database";

/** GET /api/billing/plans — público (vitrine): preços, teste grátis e vagas do fundador. */
export const GET = apiRoute({ guard: "public" }, async (): Promise<PlansResponse> => listPlans());
