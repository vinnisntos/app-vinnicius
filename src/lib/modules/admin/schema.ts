import { z } from "zod";
import { ACCESS_STATES, POST_VISIBILITIES } from "@/types/database";

const notes = z.string().trim().max(1000).optional();

export const listSubscriptionsQuery = z.object({
  state: z.enum(ACCESS_STATES).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(30),
});
export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuery>;

/** Espelha `AdminSubscriptionAction` de src/types/database.ts. */
export const subscriptionActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), admin_notes: notes }),
  z.object({ action: z.literal("revoke"), admin_notes: notes }),
  z.object({
    action: z.literal("extend_trial"),
    days: z.number().int().min(1, "Mínimo 1 dia.").max(90, "Máximo 90 dias."),
    admin_notes: notes,
  }),
  z.object({ action: z.literal("set_notes"), admin_notes: z.string().trim().max(1000) }),
]);
export type SubscriptionActionInput = z.infer<typeof subscriptionActionSchema>;

export const updateSettingsSchema = z
  .object({
    trial_days: z.number().int().min(0).max(30),
    support_whatsapp: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => /^[0-9]{12,13}$/.test(v), "Use DDI + DDD + número (ex. 5511999998888).")
      .nullable(),
    support_whatsapp_message: z.string().trim().max(300).nullable(),
    asaas_checkout_url: z
      .url()
      .refine((v) => v.startsWith("https://"), "Use um link https.")
      .nullable(),
  })
  .partial()
  .strict();
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const faqItemSchema = z.object({
  question: z.string().trim().min(3).max(300),
  answer: z.string().trim().min(1).max(5000),
  category: z.string().trim().max(60).nullable().default(null),
  order_index: z.number().int().min(0).max(1000).default(0),
  is_published: z.boolean().default(true),
});
export const updateFaqItemSchema = faqItemSchema.partial().strict();
export type FaqItemInput = z.infer<typeof faqItemSchema>;
export type UpdateFaqItemInput = z.infer<typeof updateFaqItemSchema>;

export const helpTooltipSchema = z.object({
  title: z.string().trim().max(80).nullable().default(null),
  body: z.string().trim().min(1).max(600),
  faq_item_id: z.uuid().nullable().default(null),
});
export type HelpTooltipInput = z.infer<typeof helpTooltipSchema>;

export const helpKeySchema = z.string().regex(/^[a-z0-9_]+(\.[a-z0-9_]+)+$/, "Chave inválida.");

export const moderatePostSchema = z
  .object({
    is_hidden: z.boolean(),
    hidden_reason: z.string().trim().max(300).nullable(),
    visibility: z.enum(POST_VISIBILITIES),
  })
  .partial()
  .strict();
export type ModeratePostInput = z.infer<typeof moderatePostSchema>;
