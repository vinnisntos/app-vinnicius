import type { Metadata } from "next";
import { NutritionDashboard } from "@/components/alimentacao/nutrition-dashboard";
import { requireUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Alimentação" };

export default async function AlimentacaoPage() {
  const userId = await requireUserId();
  return <NutritionDashboard userId={userId} />;
}
