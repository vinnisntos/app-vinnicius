import Link from "next/link";
import { Apple } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { MealSlotState } from "@/lib/modules/alimentacao/repository";
import { MealWaterQuickActions } from "./meal-water-quick-actions";

export function NutritionSummaryCard({
  meals,
  water,
  todayIso,
}: {
  meals: MealSlotState[];
  water: { totalMl: number; goalMl: number };
  todayIso: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <Link
          href="/alimentacao"
          className="flex items-center gap-3 hover:text-brand-400"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-400">
            <Apple className="size-4" aria-hidden />
          </div>
          <p className="text-sm font-semibold">Alimentação</p>
        </Link>
      </CardHeader>
      <CardContent>
        <MealWaterQuickActions meals={meals} water={water} todayIso={todayIso} />
      </CardContent>
    </Card>
  );
}
