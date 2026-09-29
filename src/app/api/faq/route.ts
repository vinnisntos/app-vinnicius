import { apiRoute } from "@/lib/api/handler";
import { toFaqItemRow, toPublicSettings } from "@/lib/api/mappers";
import * as repository from "@/lib/modules/conta/repository";

/** FAQ publicado + link de suporte via WhatsApp (fallback humano). */
export const GET = apiRoute({ guard: "public" }, async () => {
  const [items, settings] = await Promise.all([
    repository.getPublishedFaq(),
    repository.getAppSettings(),
  ]);

  return {
    items: items.map(toFaqItemRow),
    support_whatsapp_url: toPublicSettings(settings).support_whatsapp_url,
  };
});
