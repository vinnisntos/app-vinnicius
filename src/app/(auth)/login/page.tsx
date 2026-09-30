import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const invalidLink = params.erro === "link_invalido";
  return (
    <AuthShell eyebrow="Sua rotina, no seu ritmo" title="Que bom ter você de volta" description="Entre para acompanhar alimentação, hidratação, treinos e evolução em um só lugar.">
      {invalidLink ? <p role="alert" className="mb-5 rounded-xl border border-warning bg-warning-soft p-3 text-sm text-warning">Este link é inválido ou expirou. Solicite um novo link de recuperação.</p> : null}
      <LoginForm />
      <div className="mt-6 flex flex-col items-center gap-3 text-sm text-text-tertiary">
        <Link href="/esqueci-senha" className="min-h-11 content-center text-brand-strong underline-offset-4 hover:underline">Esqueci minha senha</Link>
        <p>Primeira vez? <Link href="/cadastro" className="text-foreground underline underline-offset-4">Criar conta grátis</Link></p>
      </div>
    </AuthShell>
  );
}
