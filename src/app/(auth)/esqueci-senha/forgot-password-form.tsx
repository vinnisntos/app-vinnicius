"use client";

import { useActionState } from "react";
import { LoaderCircle, Mail } from "lucide-react";
import { AuthFeedback, FieldErrors } from "@/components/auth/auth-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, type AuthFormState } from "@/lib/auth/actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined as AuthFormState);
  return <form action={action} className="space-y-5"><div className="space-y-2"><Label htmlFor="reset-email">E-mail</Label><Input id="reset-email" name="email" type="email" autoComplete="email" required className="h-12" aria-invalid={!!state?.fields?.email} /><FieldErrors errors={state?.fields?.email} /></div><AuthFeedback state={state} /><Button className="h-12 w-full" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Mail aria-hidden />}{pending ? "Enviando…" : "Enviar link de recuperação"}</Button></form>;
}
