"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { logWater, toggleMeal } from "@/lib/modules/alimentacao/actions";
import { MEAL_SLOT_LABELS } from "@/lib/modules/alimentacao/calculations";
import type { MealSlotState } from "@/lib/modules/alimentacao/repository";

const QUICK_AMOUNTS_ML = [200, 300, 500];

export function MealWaterQuickActions({
  meals: initialMeals,
  water,
  todayIso,
}: {
  meals: MealSlotState[];
  water: { totalMl: number; goalMl: number };
  todayIso: string;
}) {
  const [meals, setMeals] = useState(initialMeals);
  const [waterTotalMl, setWaterTotalMl] = useState(water.totalMl);
  const [, startTransition] = useTransition();

  // initialMeals/water.totalMl mudam de referência a cada revalidação do
  // Server Component (ex.: edição feita em outra aba na página Alimentação)
  // — sincroniza o estado local otimista, mesmo padrão do kanban-board.
  const [prevMeals, setPrevMeals] = useState(initialMeals);
  if (initialMeals !== prevMeals) {
    setPrevMeals(initialMeals);
    setMeals(initialMeals);
  }
  const [prevWaterTotalMl, setPrevWaterTotalMl] = useState(water.totalMl);
  if (water.totalMl !== prevWaterTotalMl) {
    setPrevWaterTotalMl(water.totalMl);
    setWaterTotalMl(water.totalMl);
  }

  const waterProgressPct = Math.min(100, Math.round((waterTotalMl / water.goalMl) * 100));

  function handleToggleMeal(meal: MealSlotState, nextCompleted: boolean) {
    setMeals((prev) =>
      prev.map((m) =>
        m.mealSlot === meal.mealSlot ? { ...m, isCompleted: nextCompleted } : m,
      ),
    );
    startTransition(async () => {
      await toggleMeal({
        logDate: todayIso,
        mealSlot: meal.mealSlot,
        isCompleted: nextCompleted,
        description: meal.description ?? undefined,
        calories: meal.calories ?? undefined,
      });
    });
  }

  function handleAddWater(amountMl: number) {
    setWaterTotalMl((prev) => prev + amountMl);
    startTransition(async () => {
      await logWater({ logDate: todayIso, amountMl });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {meals.map((meal) => (
          <label
            key={meal.mealSlot}
            className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Checkbox
              checked={meal.isCompleted}
              onCheckedChange={(checked) => handleToggleMeal(meal, checked === true)}
              className="size-3.5"
            />
            {MEAL_SLOT_LABELS[meal.mealSlot]}
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-2 rounded-full bg-brand-500 transition-all duration-200"
            style={{ width: `${waterProgressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {(waterTotalMl / 1000).toFixed(2)} L / {(water.goalMl / 1000).toFixed(1)} L
          </p>
          <div className="flex gap-1">
            {QUICK_AMOUNTS_ML.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleAddWater(amount)}
                className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-brand-500/30 hover:text-brand-400"
              >
                +{amount}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
