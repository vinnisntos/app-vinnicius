import { apiRoute } from "@/lib/api/handler";
import * as repository from "@/lib/modules/admin/repository";
import { helpKeySchema, helpTooltipSchema } from "@/lib/modules/admin/schema";

/** PUT /api/admin/help/meal_logs.calories — cria ou substitui um tooltip. */
export const PUT = apiRoute<"master", { key: string }>({ guard: "master" }, async ({ params, body }) => {
  const key = helpKeySchema.parse(decodeURIComponent(params.key));
  const row = await repository.upsertHelpTooltip(key, await body(helpTooltipSchema));
  return { key: row.key, title: row.title, body: row.body, faq_item_id: row.faqItemId };
});
