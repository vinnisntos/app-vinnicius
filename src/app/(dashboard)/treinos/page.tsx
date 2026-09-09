import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";
import { requireUserId } from "@/lib/auth/session";
import { getTodayIsoDate } from "@/lib/date";
import { getNextDayLabel, type DayLabel } from "@/lib/modules/treinos/calculations";
import {
  getActivePlan,
  getExercisesByPlan,
  getLastSessionDayLabel,
  getSessionByDate,
  getSessionSets,
  getWorkoutHistory,
} from "@/lib/modules/treinos/repository";
import { Card, CardContent } from "@/components/ui/card";
import { CreatePlanForm } from "@/components/treinos/create-plan-form";
import { PlanSettingsDialog } from "@/components/treinos/plan-settings-dialog";
import { TodayWorkoutCard } from "@/components/treinos/today-workout-card";
import { WorkoutHistoryCard } from "@/components/treinos/workout-history-card";

export const metadata: Metadata = { title: "Treinos" };

export default async function TreinosPage() {
  const userId = await requireUserId();
  const plan = await getActivePlan(userId);

  if (!plan) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tighter">Treinos</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-brand-600/10 text-brand-400">
              <Dumbbell className="size-6" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold">Crie seu plano de treino</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Divisão AB de calistenia — cadastre os exercícios de cada dia
              depois de criar o plano.
            </p>
            <CreatePlanForm />
          </CardContent>
        </Card>
      </div>
    );
  }

  const [exercises, todayIso, lastDayLabel] = await Promise.all([
    getExercisesByPlan(plan.id),
    Promise.resolve(getTodayIsoDate()),
    getLastSessionDayLabel(userId),
  ]);

  const exercisesByDay: Record<DayLabel, typeof exercises> = {
    A: exercises.filter((e) => e.dayLabel === "A"),
    B: exercises.filter((e) => e.dayLabel === "B"),
  };

  const todaySession = await getSessionByDate(userId, todayIso);
  const dayLabel: DayLabel = todaySession
    ? (todaySession.dayLabel as DayLabel)
    : getNextDayLabel(lastDayLabel);

  const [initialSets, history] = await Promise.all([
    todaySession ? getSessionSets(todaySession.id) : Promise.resolve([]),
    getWorkoutHistory(userId, 8),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tighter">Treinos</h1>
        <PlanSettingsDialog planId={plan.id} exercisesByDay={exercisesByDay} />
      </div>

      <TodayWorkoutCard
        dayLabel={dayLabel}
        exercises={exercisesByDay[dayLabel]}
        planId={plan.id}
        todayIso={todayIso}
        session={todaySession ? { id: todaySession.id, notes: todaySession.notes } : null}
        initialSets={initialSets}
      />

      <WorkoutHistoryCard history={history} />
    </div>
  );
}
