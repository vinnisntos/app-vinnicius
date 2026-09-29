import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Criar conta" };
export default function SignUpPage() {
  return <AuthShell eyebrow="3 dias grátis" title="Comece sua evolução" description="Crie sua conta e monte uma rotina de saúde que cabe na vida real."><SignUpForm /><p className="mt-6 text-center text-sm text-zinc-400">Já tem conta? <Link href="/login" className="text-white underline underline-offset-4">Entrar</Link></p></AuthShell>;
}
