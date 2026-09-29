import type { AuthFormState } from "@/lib/auth/actions";

export function AuthFeedback({ state }: { state: AuthFormState }) {
  if (state?.success) return <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{state.success}</p>;
  if (state?.error) return <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{state.error}</p>;
  return null;
}

export function FieldErrors({ errors }: { errors?: string[] }) {
  return errors?.map((error) => <p key={error} className="text-xs text-red-300">{error}</p>) ?? null;
}
