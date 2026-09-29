import { nowInTimezone } from "@/lib/integrations/google/recurrence";
import { getNutritionDay } from "@/lib/modules/alimentacao/service";
import { getProfile, getUserTimezone } from "@/lib/modules/conta/repository";
import { listTips, pickDailyTip } from "@/lib/modules/dicas/service";
import { listReminders } from "@/lib/modules/lembretes/repository";
import { dueToday } from "@/lib/modules/medicacao/service";
import { getTrainingToday } from "@/lib/modules/treinos/service";
import type { DashboardSummary, ReminderKind } from "@/types/database";
import { getNextAction, getNextReminder } from "./next-action";

/**
 * Tudo que o topo do Dashboard precisa num request: calorias/macros
 * restantes + próxima ação + próximo lembrete, no fuso do usuário.
 */
export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const timezone = await getUserTimezone(userId);
  const now = nowInTimezone(timezone);

  const [day, profile, reminders, medicationsDue, training, tips] = await Promise.all([
    getNutritionDay(userId, now.date),
    getProfile(userId),
    listReminders(userId),
    dueToday(userId, now.date),
    getTrainingToday(userId),
    listTips(),
  ]);
  const tip = pickDailyTip(tips, now.date);

  const waterTotal = day.water_logs.reduce((sum, w) => sum + w.amount_ml, 0);

  return {
    date: now.date,
    now_time: now.time,
    first_name: profile?.fullName?.trim().split(/\s+/)[0] ?? null,
    metrics: day.metrics,
    next_action: getNextAction({
      today: now.date,
      nowTime: now.time,
      hasProfile: day.profile !== null && day.latest_weight !== null,
      completedSlots: day.meals.filter((m) => m.meal?.is_completed).map((m) => m.meal_slot),
      waterTotalMl: waterTotal,
      waterGoalMl: day.profile?.water_goal_ml ?? null,
      latestWeightDate: day.latest_weight?.logged_at ?? null,
      medicationsDue,
    }),
    next_reminder: getNextReminder(
      reminders.map((r) => ({
        kind: r.kind as ReminderKind,
        title: r.title,
        daysOfWeek: r.daysOfWeek,
        localTime: r.localTime.slice(0, 5),
        isActive: r.isActive,
      })),
      { today: now.date, nowTime: now.time },
    ),
    latest_weight_kg: day.latest_weight?.weight_kg ?? null,
    today_workout:
      training.program && training.next_workout
        ? {
            title: training.next_workout.title,
            program_title: training.program.title,
            estimated_minutes: training.next_workout.estimated_minutes,
            done_today: training.done_today,
          }
        : null,
    daily_tip: tip ? { id: tip.id, title: tip.title, category: tip.category, read_minutes: tip.read_minutes } : null,
  };
}
