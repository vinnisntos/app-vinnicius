import { z } from "zod";
import { emailSchema, phoneSchema } from "@/lib/modules/conta/schema";

export const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter ao menos 8 caracteres.")
  .max(72, "Senha longa demais."); // limite do bcrypt no Supabase Auth

export const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome.").max(80),
  email: emailSchema,
  // Opcional no cadastro; vazio vira null (só catálogo).
  phone: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(phoneSchema.nullable()),
  password: passwordSchema,
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
