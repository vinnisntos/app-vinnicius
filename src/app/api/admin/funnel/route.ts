import { apiRoute } from "@/lib/api/handler";
import { funnelQuery, getFunnel } from "@/lib/modules/analytics/funnel";
import type { FunnelResponse } from "@/types/database";

/** GET /api/admin/funnel?days=30 — funil cadastro → ativação → pagamento (só agregados). */
export const GET = apiRoute(
  { guard: "master" },
  async ({ query }): Promise<FunnelResponse> => getFunnel(query(funnelQuery).days),
);
