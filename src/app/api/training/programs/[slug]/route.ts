import { z } from "zod";
import { apiRoute, notFound } from "@/lib/api/handler";
import { getProgramDetail } from "@/lib/modules/treinos/service";

/** GET /api/training/programs/:slug → `ProgramDetail` */
export const GET = apiRoute<"access", { slug: string }>({ guard: "access" }, async ({ params }) => {
  const detail = await getProgramDetail(z.string().regex(/^[a-z0-9-]+$/).parse(params.slug));
  if (!detail) throw notFound("Programa");
  return detail;
});
