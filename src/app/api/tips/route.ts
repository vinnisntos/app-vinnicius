import { apiRoute } from "@/lib/api/handler";
import { listTips, tipsQuery } from "@/lib/modules/dicas/service";

/** GET /api/tips?category= → `TipRow[]` (publicadas, mais recentes primeiro). */
export const GET = apiRoute({ guard: "access", help: ["route.dicas"] }, async ({ query }) =>
  listTips(query(tipsQuery).category),
);
