import type { Metadata } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[size:40px_40px] opacity-[0.15] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-brand-600 via-brand-500/30 to-transparent blur-[120px]"
      />

      <div className="relative z-10 w-full max-w-sm">
        <p className="mb-8 text-center text-xs font-semibold tracking-widest text-gray-400 uppercase">
          Life OS · Vinnicius Santos
        </p>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <h1 className="text-2xl font-bold tracking-tighter">Entrar</h1>
            <p className="text-sm text-muted-foreground">
              Acesso privado — só você.
            </p>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
