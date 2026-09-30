import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WelcomeWizard } from "@/components/onboarding/welcome-wizard";
import { requireUserId } from "@/lib/auth/session";
import { getProfile } from "@/lib/modules/conta/repository";

export const metadata: Metadata = { title: "Boas-vindas" };

/** Assistente do primeiro acesso — fora do AppShell do app. */
export default async function BoasVindasPage() {
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  if (profile?.onboardingCompletedAt) redirect("/");
  const firstName = profile?.fullName?.trim().split(/\s+/)[0] ?? null;
  return <WelcomeWizard userId={userId} firstName={firstName} />;
}
