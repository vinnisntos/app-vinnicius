import type { Metadata } from "next";
import { Apple } from "lucide-react";
import { requireUserId } from "@/lib/auth/session";
import { getTodayIsoDate } from "@/lib/date";
import {
  calculateBMR,
  calculateDeficit,
  calculateTDEE,
  type ActivityLevel,
  type Sex,
} from "@/lib/modules/alimentacao/calculations";
import {
  getLatestWeight,
  getNutritionProfile,
  getTodayMeals,
  getTodayWaterTotalMl,
  getWeightHistory,
} from "@/lib/modules/alimentacao/repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalorieSummaryCard } from "@/components/alimentacao/calorie-summary-card";
import { MealChecklist } from "@/components/alimentacao/meal-checklist";
import { NutritionSettingsDialog } from "@/components/alimentacao/nutrition-settings-dialog";
import { WaterTracker } from "@/components/alimentacao/water-tracker";
import { WeightLogCard } from "@/components/alimentacao/weight-log-card";

export const metadata: Metadata = { title: "Alimentação" };

export default async function AlimentacaoPage() {
  const userId = await requireUserId();
  const profile = await getNutritionProfile(userId);
  const logDate = getTodayIsoDate();

  if (!profile) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tighter">Alimentação</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-brand-600/10 text-brand-400">
              <Apple className="size-6" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold">
              Configure seu perfil para começar
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Preciso de sexo, altura, data de nascimento e nível de atividade
              para calcular seu TDEE e acompanhar déficit calórico.
            </p>
            <NutritionSettingsDialog
              trigger={<Button>Configurar perfil</Button>}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const [latestWeight, weightHistoryRows, todayMeals, todayWaterMl] =
    await Promise.all([
      getLatestWeight(userId),
      getWeightHistory(userId, 6),
      getTodayMeals(userId, logDate),
      getTodayWaterTotalMl(userId, logDate),
    ]);

  const caloriesConsumedToday = todayMeals.reduce(
    (sum, meal) => sum + (meal.isCompleted ? (meal.calories ?? 0) : 0),
    0,
  );

  const weightHistory = weightHistoryRows.map((row) => ({
    loggedAt: row.loggedAt,
    weightKg: Number(row.weightKg),
  }));

  const profileFormValues = {
    sex: profile.sex as Sex,
    birthDate: profile.birthDate,
    heightCm: Number(profile.heightCm),
    activityLevel: profile.activityLevel as ActivityLevel,
    calorieGoal: Number(profile.calorieGoal),
    waterGoalMl: profile.waterGoalMl,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tighter">Alimentação</h1>
        <NutritionSettingsDialog defaultValues={profileFormValues} />
      </div>

      {latestWeight ? (
        (() => {
          const bmr = calculateBMR({
            sex: profileFormValues.sex,
            weightKg: Number(latestWeight.weightKg),
            heightCm: profileFormValues.heightCm,
            birthDate: profileFormValues.birthDate,
            today: logDate,
          });
          const tdee = calculateTDEE(bmr, profileFormValues.activityLevel);
          const deficit = calculateDeficit(tdee, caloriesConsumedToday);

          return (
            <CalorieSummaryCard
              tdee={tdee}
              calorieGoal={profileFormValues.calorieGoal}
              caloriesConsumedToday={caloriesConsumedToday}
              deficit={deficit}
            />
          );
        })()
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Registre seu peso abaixo para calcular o TDEE.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WaterTracker
          totalMl={todayWaterMl}
          goalMl={profile.waterGoalMl}
          logDate={logDate}
        />
        <WeightLogCard history={weightHistory} logDate={logDate} />
      </div>

      <MealChecklist initialMeals={todayMeals} logDate={logDate} />
    </div>
  );
}
