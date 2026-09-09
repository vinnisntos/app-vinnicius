import Link from "next/link";
import { Apple } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { MealSlotState } from "@/lib/modules/alimentacao/repository";

export function NutritionSummaryCard({
  meals,
  water,
}: {
  meals: MealSlotState[];
  water: { totalMl: number; goalMl: number };
}) {
  const completedMeals = meals.filter((meal) => meal.isCompleted).length;
  const waterProgressPct = Math.min(
    100,
    Math.round((water.totalMl / water.goalMl) * 100),
  );

  return (
    <Link href="/alimentacao">
      <Card className="h-full transition-colors duration-150 hover:ring-brand-500/30">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-400">
            <Apple className="size-4" aria-hidden />
          </div>
          <p className="text-sm font-semibold">Alimentação</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="font-mono text-2xl font-semibold">
            {completedMeals}/{meals.length}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              refeições
            </span>
          </p>
          <div className="flex flex-col gap-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-2 rounded-full bg-brand-500 transition-all duration-200"
                style={{ width: `${waterProgressPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {(water.totalMl / 1000).toFixed(2)} L / {(water.goalMl / 1000).toFixed(1)} L
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
