import { z } from "zod";
import { emailSchema, phoneSchema } from "@/lib/modules/conta/schema";
import { MEDICATION_STATUSES } from "@/types/database";

export const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter ao menos 8 caracteres.")
  .max(72, "Senha longa demais."); // limite do bcrypt no Supabase Auth

const utmSchema = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((v) => v || undefined);

export const signUpSchema = z
  .object({
    full_name: z.string().trim().min(2, "Informe seu nome.").max(80),
    email: emailSchema,
    // Opcional no cadastro; vazio vira null (só catálogo).
    phone: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .pipe(phoneSchema.nullable()),
    password: passwordSchema,
    confirm_password: z.string(),
    // "Você usa medicação para emagrecer prescrita pelo seu médico?"
    medication_status: z.enum(MEDICATION_STATUSES, "Escolha uma opção."),
    // Checkbox de consentimento específico para dados de saúde (LGPD).
    health_consent: z.literal("on", "É preciso autorizar o uso dos dados de saúde para criar a conta."),
    // Origem do cadastro (campos ocultos preenchidos a partir da URL).
    utm_source: utmSchema,
    utm_medium: utmSchema,
    utm_campaign: utmSchema,
    utm_content: utmSchema,
    utm_term: utmSchema,
  })
  .refine((v) => v.password === v.confirm_password, {
    message: "As senhas não conferem.",
    path: ["confirm_password"],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const requestPasswordResetSchema = z.object({ email: emailSchema });

export const updatePasswordSchema = z
  .object({ password: passwordSchema, confirm_password: z.string() })
  .refine((v) => v.password === v.confirm_password, {
    message: "As senhas não conferem.",
    path: ["confirm_password"],
  });

/**
 * Destino pós-confirmação: só caminho relativo interno. Bloqueia open
 * redirect ("//evil.com", "https://…", "/\\evil.com").
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
