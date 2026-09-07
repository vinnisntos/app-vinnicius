import type { ReactNode } from "react";
import { requireUserId } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // O middleware já bloqueia rota sem sessão; esta chamada é a segunda
  // camada (garante que toda página deste grupo tenha um userId resolvido
  // antes de qualquer query, e serve de defesa caso o layout seja alcançado
  // por outro caminho no futuro).
  await requireUserId();

  return <AppShell>{children}</AppShell>;
}
