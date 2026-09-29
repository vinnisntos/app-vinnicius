import { z } from "zod";
import { apiRoute } from "@/lib/api/handler";
import { getHelp } from "@/lib/api/help";
import type { HelpKey } from "@/types/database";

const querySchema = z.object({
  keys: z
    .string()
    .transform((v) => v.split(",").map((k) => k.trim()).filter(Boolean))
    .pipe(
      z
        .array(z.string().regex(/^[a-z0-9_]+(\.[a-z0-9_]+)+$/, "Chave inválida."))
        .min(1)
        .max(50),
    ),
});

/** GET /api/help?keys=meal_logs.calories,metric.tdee — tooltips sob demanda. */
export const GET = apiRoute({ guard: "public" }, async ({ query }) => {
  const { keys } = query(querySchema);
  return getHelp(keys as HelpKey[]);
});
