"use client";

import { useActionState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { AuthFeedback, FieldErrors } from "@/components/auth/auth-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword, type AuthFormState } from "@/lib/auth/actions";

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined as AuthFormState);
  return <form action={action} className="space-y-5">
    <div className="space-y-2"><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" name="password" type="password" minLength={8} autoComplete="new-password" required className="h-12" aria-invalid={!!state?.fields?.password} /><FieldErrors errors={state?.fields?.password} /></div>
    <div className="space-y-2"><Label htmlFor="confirm-password">Confirmar nova senha</Label><Input id="confirm-password" name="confirm_password" type="password" minLength={8} autoComplete="new-password" required className="h-12" aria-invalid={!!state?.fields?.confirm_password} /><FieldErrors errors={state?.fields?.confirm_password} /></div>
    <AuthFeedback state={state} /><Button className="h-12 w-full" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <KeyRound aria-hidden />}{pending ? "Atualizando…" : "Salvar nova senha"}</Button>
  </form>;
}
