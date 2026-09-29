import { apiRoute } from "@/lib/api/handler";
import * as repository from "@/lib/modules/admin/repository";
import { updateSettingsSchema } from "@/lib/modules/admin/schema";
import type { AppSettingsRow } from "@/types/database";

const toRow = (s: NonNullable<Awaited<ReturnType<typeof repository.getFullSettings>>>): AppSettingsRow => ({
  id: true,
  trial_days: s.trialDays,
  support_whatsapp: s.supportWhatsapp,
  support_whatsapp_message: s.supportWhatsappMessage,
  asaas_checkout_url: s.asaasCheckoutUrl,
  updated_at: s.updatedAt.toISOString(),
});

export const GET = apiRoute({ guard: "master" }, async () => toRow(await repository.getFullSettings()));

export const PATCH = apiRoute({ guard: "master" }, async ({ body }) =>
  toRow(await repository.updateSettings(await body(updateSettingsSchema))),
);
