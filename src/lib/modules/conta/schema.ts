import { z } from "zod";
import { MEDICATION_STATUSES } from "@/types/database";

/** Celular: aceita máscara ("(11) 99999-8888"), persiste só dígitos. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => /^[0-9]{10,13}$/.test(v), "Celular inválido — use DDD + número.");

/** Validação básica pedida: precisa conter "@" com algo antes e depois. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[^@\s]+@[^@\s]+$/, "E-mail inválido.");

export const updateProfileSchema = z
  .object({
    full_name: z.string().trim().min(2, "Nome muito curto.").max(80),
    avatar_url: z.url().max(500).nullable(),
    timezone: z
      .string()
      .refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), "Fuso horário inválido."),
    phone: phoneSchema.nullable(),
    sound_enabled: z.boolean(),
    haptics_enabled: z.boolean(),
    onboarding_completed: z.literal(true),
    medication_status: z.enum(MEDICATION_STATUSES),
  })
  .partial()
  .strict();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
