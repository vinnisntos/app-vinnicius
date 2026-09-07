"use client";

import { useState, useTransition } from "react";
import { updateNutritionProfile } from "@/lib/modules/alimentacao/actions";
import {
  ACTIVITY_LABELS,
  type ActivityLevel,
  type Sex,
} from "@/lib/modules/alimentacao/calculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type NutritionProfileFormValues = {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  activityLevel: ActivityLevel;
  calorieGoal: number;
  waterGoalMl: number;
};

const DEFAULTS: NutritionProfileFormValues = {
  sex: "M",
  birthDate: "",
  heightCm: 170,
  activityLevel: "moderado",
  calorieGoal: 2500,
  waterGoalMl: 3000,
};

export function NutritionProfileForm({
  defaultValues,
  onSaved,
}: {
  defaultValues?: NutritionProfileFormValues;
  onSaved?: () => void;
}) {
  const [values, setValues] = useState<NutritionProfileFormValues>(
    defaultValues ?? DEFAULTS,
  );
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await updateNutritionProfile(values);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sex">Sexo biológico</Label>
          <Select
            value={values.sex}
            onValueChange={(v) => setValues((s) => ({ ...s, sex: v as Sex }))}
          >
            <SelectTrigger id="sex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Masculino</SelectItem>
              <SelectItem value="F">Feminino</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="birthDate">Data de nascimento</Label>
          <Input
            id="birthDate"
            type="date"
            required
            value={values.birthDate}
            onChange={(e) =>
              setValues((s) => ({ ...s, birthDate: e.target.value }))
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="heightCm">Altura (cm)</Label>
          <Input
            id="heightCm"
            type="number"
            min={0}
            max={280}
            required
            value={values.heightCm}
            onChange={(e) =>
              setValues((s) => ({ ...s, heightCm: Number(e.target.value) }))
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="activityLevel">Nível de atividade</Label>
          <Select
            value={values.activityLevel}
            onValueChange={(v) =>
              setValues((s) => ({ ...s, activityLevel: v as ActivityLevel }))
            }
          >
            <SelectTrigger id="activityLevel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="calorieGoal">Meta calórica (kcal/dia)</Label>
          <Input
            id="calorieGoal"
            type="number"
            min={0}
            required
            value={values.calorieGoal}
            onChange={(e) =>
              setValues((s) => ({ ...s, calorieGoal: Number(e.target.value) }))
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="waterGoalMl">Meta de água (ml/dia)</Label>
          <Input
            id="waterGoalMl"
            type="number"
            min={0}
            required
            value={values.waterGoalMl}
            onChange={(e) =>
              setValues((s) => ({ ...s, waterGoalMl: Number(e.target.value) }))
            }
          />
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-sm border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-red-400"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
