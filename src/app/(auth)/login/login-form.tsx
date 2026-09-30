"use client";

import { useActionState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined as LoginState);
  return <form action={action} className="space-y-5">
    <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" autoComplete="email" required className="h-12" placeholder="voce@exemplo.com" aria-invalid={!!state?.error} /></div>
    <div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" name="password" type="password" autoComplete="current-password" required className="h-12" aria-invalid={!!state?.error} /></div>
    {state?.error ? <p role="alert" className="rounded-xl border border-danger bg-danger-soft p-3 text-sm text-danger">{state.error}</p> : null}
    <Button className="h-12 w-full shadow-[var(--shadow-glow)]" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <LogIn aria-hidden />}{pending ? "Entrando…" : "Entrar"}</Button>
  </form>;
}
