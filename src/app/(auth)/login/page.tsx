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
      {invalidLink ? <p role="alert" className="mb-5 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">Este link é inválido ou expirou. Solicite um novo link de recuperação.</p> : null}
      <LoginForm />
      <div className="mt-6 flex flex-col items-center gap-3 text-sm text-zinc-400">
        <Link href="/esqueci-senha" className="min-h-11 content-center text-brand-300 underline-offset-4 hover:underline">Esqueci minha senha</Link>
        <p>Primeira vez? <Link href="/cadastro" className="text-white underline underline-offset-4">Criar conta grátis</Link></p>
      </div>
    </AuthShell>
  );
}
