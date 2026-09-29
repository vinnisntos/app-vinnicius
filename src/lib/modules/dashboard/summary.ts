import { nowInTimezone } from "@/lib/integrations/google/recurrence";
import { getNutritionDay } from "@/lib/modules/alimentacao/service";
import { getProfile, getUserTimezone } from "@/lib/modules/conta/repository";
import { listReminders } from "@/lib/modules/lembretes/repository";
import type { DashboardSummary, ReminderKind } from "@/types/database";
import { getNextAction, getNextReminder } from "./next-action";

/**
 * Tudo que o topo do Dashboard precisa num request: calorias/macros
 * restantes + próxima ação + próximo lembrete, no fuso do usuário.
 */
export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const timezone = await getUserTimezone(userId);
  const now = nowInTimezone(timezone);

  const [day, profile, reminders] = await Promise.all([
    getNutritionDay(userId, now.date),
    getProfile(userId),
    listReminders(userId),
  ]);

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
  };
}
