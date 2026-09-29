import { apiRoute } from "@/lib/api/handler";
import { getDashboardSummary } from "@/lib/modules/dashboard/summary";
import type { DashboardSummary } from "@/types/database";

/** GET /api/dashboard/summary → `DashboardSummary` */
export const GET = apiRoute(
  { guard: "access", help: ["metric.tdee", "water_logs.amount_ml"] },
  async ({ userId }): Promise<DashboardSummary> => getDashboardSummary(userId),
);
