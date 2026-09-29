import { apiRoute } from "@/lib/api/handler";
import { getProgress, progressQuery } from "@/lib/modules/progresso/service";

/** GET /api/progress?days=90 → `ProgressResponse` */
export const GET = apiRoute(
  { guard: "access", help: ["route.progresso", "body_measurements.waist_cm"] },
  async ({ userId, query }) => getProgress(userId, query(progressQuery).days),
);
