import type { Metadata } from "next";
import { NutritionDashboard } from "@/components/alimentacao/nutrition-dashboard";

export const metadata: Metadata = { title: "Alimentação" };

export default function AlimentacaoPage() {
  return <NutritionDashboard />;
}
