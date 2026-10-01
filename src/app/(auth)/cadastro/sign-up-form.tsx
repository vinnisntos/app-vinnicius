"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, UserPlus } from "lucide-react";
import { AuthFeedback, FieldErrors } from "@/components/auth/auth-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { UtmFields } from "@/components/site/utm-capture";
import { signUp, type AuthFormState } from "@/lib/auth/actions";
import { HEALTH_CONSENT_TEXT, type MedicationStatus } from "@/types/database";

const MEDICATION_OPTIONS: { value: MedicationStatus; label: string }[] = [
  { value: "usa", label: "Sim" },
  { value: "vai_comecar", label: "Vou começar" },
  { value: "nao_usa", label: "Não" },
];

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
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium leading-snug">Você usa medicação para emagrecer prescrita pelo seu médico?</legend>
      <div className="grid grid-cols-3 gap-2">
        {MEDICATION_OPTIONS.map((option) => <label key={option.value} className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-glass-border bg-glass px-2 text-center text-sm font-semibold transition has-[:checked]:border-brand-strong has-[:checked]:bg-brand-soft has-[:checked]:text-brand-strong has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500">
          <input type="radio" name="medication_status" value={option.value} required className="sr-only" />{option.label}
        </label>)}
      </div>
      <FieldErrors errors={state?.fields?.medication_status} />
    </fieldset>
    <div className="space-y-2">
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-glass-border bg-glass p-3 text-xs leading-relaxed text-text-secondary">
        <input type="checkbox" name="health_consent" required className="mt-0.5 size-5 shrink-0 accent-[var(--brand-600)]" aria-invalid={!!state?.fields?.health_consent} />
        <span>{HEALTH_CONSENT_TEXT} <Link href="/privacidade" className="font-semibold text-foreground underline underline-offset-4">Ler a política</Link></span>
      </label>
      <FieldErrors errors={state?.fields?.health_consent} />
    </div>
    <UtmFields />
    <AuthFeedback state={state} />
    {!state?.success ? <Button className="h-12 w-full shadow-[var(--shadow-glow)]" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <UserPlus aria-hidden />}{pending ? "Criando conta…" : "Criar conta grátis"}</Button> : null}
  </form>;
}
