"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = undefined;

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    signIn,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={!!state?.error}
          placeholder="voce@exemplo.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={!!state?.error}
        />
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="rounded-sm border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-red-400"
        >
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        className="shadow-[var(--shadow-glow)]"
      >
        {isPending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
