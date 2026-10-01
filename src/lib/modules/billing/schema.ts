import { z } from "zod";
import { isValidCpf, normalizeCpf } from "@/lib/validation/cpf";
import { BILLING_PLAN_IDS, CANCEL_REASONS } from "@/types/database";

/**
 * POST /api/billing/checkout. CPF só é exigido na PRIMEIRA vez (quando ainda
 * não há cliente no Asaas) — o service responde 422 `fields.cpf` se faltar.
 */
export const checkoutSchema = z
  .object({
    cpf: z
      .string()
      .trim()
      .refine(isValidCpf, "CPF inválido.")
      .transform(normalizeCpf)
      .optional(),
    plan: z.enum(BILLING_PLAN_IDS).default("mensal"),
  })
  .strict();

/** Espelha `CancelSubscriptionRequest`. */
export const cancelSchema = z
  .object({
    reason: z.enum(CANCEL_REASONS).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();
export type CancelInput = z.infer<typeof cancelSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
