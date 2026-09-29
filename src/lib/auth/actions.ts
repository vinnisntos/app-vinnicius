"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  requestPasswordResetSchema,
  signUpSchema,
  updatePasswordSchema,
} from "./schema";

/**
 * Estado dos formulários de auth (useActionState). `fields` = erros por
 * campo para exibir inline; `success` = mensagem neutra de confirmação.
 */
export type AuthFormState =
  | { error?: string; fields?: Record<string, string[] | undefined>; success?: string }
  | undefined;

/** Base das URLs enviadas por e-mail. APP_URL em produção; em dev, o host do request. */
async function appUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

const formToObject = (formData: FormData) =>
  Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Cadastro com trial automático: o trigger `handle_new_user` (0003) cria
 * profile + subscription (trial_ends_at = created_at + trial_days).
 * E-mail de confirmação obrigatório (config do projeto Supabase) — o link
 * volta em /auth/confirm.
 */
export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message,
      fields: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { full_name, email, phone, password } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Lidos pelo trigger handle_new_user → profiles.full_name/phone.
      data: { full_name, phone },
      emailRedirectTo: `${await appUrl()}/auth/confirm?next=/`,
    },
  });

  if (error) {
    // Supabase já responde de forma neutra para e-mail existente (não vaza
    // conta); os erros que chegam aqui são de senha fraca/rate limit.
    if (error.code === "weak_password") {
      return { error: "Senha fraca demais — use letras, números e símbolos." };
    }
    if (error.status === 429) {
      return { error: "Muitas tentativas. Aguarde alguns minutos." };
    }
    console.error("[auth] signUp", error.code, error.message);
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  return { success: "Enviamos um link de confirmação para o seu e-mail." };
}

/** Sempre a mesma resposta — não revela se o e-mail tem conta. */
export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = requestPasswordResetSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, fields: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await appUrl()}/auth/confirm?next=/redefinir-senha`,
  });
  if (error) console.error("[auth] resetPasswordForEmail", error.code, error.message);

  return { success: "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha." };
}

/** Usado em /redefinir-senha — a sessão de recuperação vem do /auth/confirm. */
export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = updatePasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, fields: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { error: "Use uma senha diferente da atual." };
    if (error.code === "weak_password") return { error: "Senha fraca demais." };
    return { error: "Link expirado. Solicite a redefinição novamente." };
  }

  redirect("/");
}
