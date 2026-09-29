import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { requireUserId } from "@/lib/auth/session";
import { UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = { title: "Nova senha" };
export default async function UpdatePasswordPage() {
  await requireUserId();
  return <AuthShell eyebrow="Conta protegida" title="Crie uma nova senha" description="Use ao menos 8 caracteres e escolha uma senha diferente da anterior."><UpdatePasswordForm /></AuthShell>;
}
