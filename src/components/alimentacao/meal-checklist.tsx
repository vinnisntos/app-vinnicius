"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toggleMeal } from "@/lib/modules/alimentacao/actions";
import {
  MEAL_SLOT_LABELS,
  type MealSlot,
} from "@/lib/modules/alimentacao/calculations";
import type { MealSlotState } from "@/lib/modules/alimentacao/repository";

export function MealChecklist({
  initialMeals,
  logDate,
}: {
  initialMeals: MealSlotState[];
  logDate: string;
}) {
  const [meals, setMeals] = useState(initialMeals);
  const [, startTransition] = useTransition();

  function updateLocal(mealSlot: MealSlot, patch: Partial<MealSlotState>) {
    setMeals((prev) =>
      prev.map((m) => (m.mealSlot === mealSlot ? { ...m, ...patch } : m)),
    );
  }

  function persist(mealSlot: MealSlot, next: MealSlotState) {
    startTransition(async () => {
      await toggleMeal({
        logDate,
        mealSlot,
        isCompleted: next.isCompleted,
        description: next.description ?? undefined,
        calories: next.calories ?? undefined,
      });
    });
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Refeições de hoje</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {meals.map((meal) => (
          <div
            key={meal.mealSlot}
            className={cn(
              "flex flex-col gap-2 rounded-lg border border-white/10 p-3 sm:flex-row sm:items-center",
              meal.isCompleted && "border-brand-500/30 bg-brand-600/10",
            )}
          >
            <label className="flex flex-1 items-center gap-3">
              <Checkbox
                checked={meal.isCompleted}
                onCheckedChange={(checked) => {
                  const next = { ...meal, isCompleted: checked === true };
                  updateLocal(meal.mealSlot, next);
                  persist(meal.mealSlot, next);
                }}
              />
              <span className="text-sm font-medium">
                {MEAL_SLOT_LABELS[meal.mealSlot]}
              </span>
            </label>

            <div className="flex gap-2 sm:w-2/3">
              <Input
                placeholder="O que comeu (opcional)"
                value={meal.description ?? ""}
                onChange={(e) =>
                  updateLocal(meal.mealSlot, { description: e.target.value })
                }
                onBlur={() => persist(meal.mealSlot, meal)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="kcal"
                min={0}
                value={meal.calories ?? ""}
                onChange={(e) =>
                  updateLocal(meal.mealSlot, {
                    calories: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                onBlur={() => persist(meal.mealSlot, meal)}
                className="w-24"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
