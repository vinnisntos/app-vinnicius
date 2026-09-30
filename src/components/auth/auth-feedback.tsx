import type { AuthFormState } from "@/lib/auth/actions";

export function AuthFeedback({ state }: { state: AuthFormState }) {
  if (state?.success) return <p role="status" className="rounded-xl border border-success/20 bg-success-soft p-3 text-sm text-success">{state.success}</p>;
  if (state?.error) return <p role="alert" className="rounded-xl border border-danger bg-danger-soft p-3 text-sm text-danger">{state.error}</p>;
  return null;
}

export function FieldErrors({ errors }: { errors?: string[] }) {
  return errors?.map((error) => <p key={error} className="text-xs text-danger">{error}</p>) ?? null;
}
