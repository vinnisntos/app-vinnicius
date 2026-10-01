import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { getAppSettings } from "@/lib/modules/conta/repository";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Criar conta" };
export default async function SignUpPage() {
  const trialDays = (await getAppSettings().catch(() => null))?.trialDays ?? 7;
  return <AuthShell eyebrow={`${trialDays} dias grátis`} title="Comece com tudo anotado" description="Crie sua conta e acompanhe aplicações, proteína, água e peso em um só lugar."><SignUpForm /><p className="mt-6 text-center text-sm text-text-tertiary">Já tem conta? <Link href="/login" className="text-foreground underline underline-offset-4">Entrar</Link></p></AuthShell>;
}
