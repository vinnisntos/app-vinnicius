import { z } from "zod";
import { isValidCpf, normalizeCpf } from "@/lib/validation/cpf";

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
  })
  .strict();
export type CheckoutInput = z.infer<typeof checkoutSchema>;
