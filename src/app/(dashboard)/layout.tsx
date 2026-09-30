import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AccessProvider } from "@/components/access/access-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PreferencesProvider } from "@/components/preferences/preferences-provider";
import { requireAppAccess } from "@/lib/access/status";
import { requireUserId } from "@/lib/auth/session";
import { getProfile } from "@/lib/modules/conta/repository";
import type { UserRole } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // O proxy já bloqueia rota sem sessão; esta chamada é a segunda camada.
  const userId = await requireUserId();

  // Paywall de página: sem acesso (trial expirado/revogado) → /assinar.
  // Redirect em vez de modal por cima: as páginas deste grupo buscam dado
  // no server via Drizzle, então renderizá-las por baixo de um modal
  // entregaria o conteúdo pago no HTML.
  const [access, profile] = await Promise.all([
    requireAppAccess(userId),
    getProfile(userId),
  ]);

  // Primeiro acesso: assistente de boas-vindas antes do app.
  if (profile && profile.onboardingCompletedAt === null) redirect("/boas-vindas");

  return (
    <AccessProvider initialAccess={access} role={(profile?.role ?? "user") as UserRole}>
      <PreferencesProvider
        initial={{ soundEnabled: profile?.soundEnabled ?? true, hapticsEnabled: profile?.hapticsEnabled ?? true }}
      >
        <AppShell userId={userId}>{children}</AppShell>
      </PreferencesProvider>
    </AccessProvider>
  );
}
