"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, UserPlus } from "lucide-react";
import { AuthFeedback, FieldErrors } from "@/components/auth/auth-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { signUp, type AuthFormState } from "@/lib/auth/actions";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, undefined as AuthFormState);
  const [phone, setPhone] = useState("");
  const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };
  return <form action={action} className="space-y-4">
    <div className="space-y-2"><Label htmlFor="full_name">Nome completo</Label><Input id="full_name" name="full_name" autoComplete="name" required className="h-12" aria-invalid={!!state?.fields?.full_name} /><FieldErrors errors={state?.fields?.full_name} /></div>
    <div className="space-y-2"><Label htmlFor="signup-email">E-mail</Label><Input id="signup-email" name="email" type="email" autoComplete="email" required className="h-12" aria-invalid={!!state?.fields?.email} /><FieldErrors errors={state?.fields?.email} /></div>
    <div className="space-y-2"><Label htmlFor="phone">Celular <span className="text-text-tertiary">(opcional)</span></Label><Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" className="h-12" placeholder="(11) 99999-9999" value={phone} onChange={(event) => setPhone(maskPhone(event.target.value))} aria-invalid={!!state?.fields?.phone} /><FieldErrors errors={state?.fields?.phone} /></div>
    <div className="space-y-2"><Label htmlFor="signup-password">Senha</Label><PasswordInput id="signup-password" name="password" minLength={8} autoComplete="new-password" required className="h-12" aria-invalid={!!state?.fields?.password} /><FieldErrors errors={state?.fields?.password} /></div>
    <div className="space-y-2"><Label htmlFor="signup-confirm-password">Confirme a senha</Label><PasswordInput id="signup-confirm-password" name="confirm_password" autoComplete="new-password" required className="h-12" aria-invalid={!!state?.fields?.confirm_password} /><FieldErrors errors={state?.fields?.confirm_password} /></div>
    <AuthFeedback state={state} />
    {!state?.success ? <Button className="h-12 w-full shadow-[var(--shadow-glow)]" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <UserPlus aria-hidden />}{pending ? "Criando conta…" : "Criar conta grátis"}</Button> : null}
  </form>;
}
