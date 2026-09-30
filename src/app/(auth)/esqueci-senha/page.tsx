import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Recuperar senha" };
export default function ForgotPasswordPage() {
  return <AuthShell eyebrow="Recupere seu acesso" title="Esqueceu a senha?" description="Informe seu e-mail. Se houver uma conta, enviaremos um link seguro para criar outra senha."><ForgotPasswordForm /><p className="mt-6 text-center text-sm"><Link href="/login" className="text-text-secondary underline underline-offset-4">Voltar para entrar</Link></p></AuthShell>;
}
