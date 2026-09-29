import type {
  AppSettings,
  CalendarReminder,
  FaqItem,
  MealLog,
  NutritionProfile,
  Post,
  Profile,
  Subscription,
  WaterLog,
  WeightLog,
} from "@/lib/db/schema";
import type {
  ActivityLevel,
  CalendarReminderRow,
  FaqItemRow,
  MealLogRow,
  MealSlot,
  NutritionGoal,
  NutritionProfileRow,
  PostRow,
  PostVisibility,
  ProfileRow,
  PublicSettings,
  ReminderKind,
  Sex,
  SubscriptionRow,
  SubscriptionStatus,
  UserRole,
  WaterLogRow,
  WeightLogRow,
} from "@/types/database";

/**
 * Drizzle (camelCase, numeric como string, timestamptz como Date) →
 * contrato de API (snake_case, number, ISO string) de src/types/database.ts.
 * Toda resposta de `/api` passa por aqui — o front nunca vê o shape Drizzle.
 */

const iso = (d: Date) => d.toISOString();
const isoOrNull = (d: Date | null) => (d ? d.toISOString() : null);
const num = (v: string) => Number(v);
const numOrNull = (v: string | null) => (v == null ? null : Number(v));

export const toProfileRow = (p: Profile): ProfileRow => ({
  id: p.id,
  full_name: p.fullName,
  avatar_url: p.avatarUrl,
  timezone: p.timezone,
  role: p.role as UserRole,
  email: p.email,
  phone: p.phone,
  created_at: iso(p.createdAt),
  updated_at: iso(p.updatedAt),
});

export const toSubscriptionRow = (s: Subscription): SubscriptionRow => ({
  user_id: s.userId,
  status: s.status as SubscriptionStatus,
  is_active_subscription: s.isActiveSubscription ?? s.status === "active",
  trial_ends_at: iso(s.trialEndsAt),
  current_period_end: isoOrNull(s.currentPeriodEnd),
  asaas_customer_id: s.asaasCustomerId,
  asaas_subscription_id: s.asaasSubscriptionId,
  approved_by: s.approvedBy,
  approved_at: isoOrNull(s.approvedAt),
  revoked_at: isoOrNull(s.revokedAt),
  admin_notes: s.adminNotes,
  created_at: iso(s.createdAt),
  updated_at: iso(s.updatedAt),
});

export const toNutritionProfileRow = (n: NutritionProfile): NutritionProfileRow => ({
  user_id: n.userId,
  sex: n.sex as Sex,
  birth_date: n.birthDate,
  height_cm: num(n.heightCm),
  activity_level: n.activityLevel as ActivityLevel,
  formula: "mifflin_st_jeor",
  calorie_goal: num(n.calorieGoal),
  water_goal_ml: n.waterGoalMl,
  goal: n.goal as NutritionGoal,
  target_weight_kg: numOrNull(n.targetWeightKg),
  updated_at: iso(n.updatedAt),
});

export const toWeightLogRow = (w: WeightLog): WeightLogRow => ({
  id: w.id,
  user_id: w.userId,
  logged_at: w.loggedAt,
  weight_kg: num(w.weightKg),
});

export const toMealLogRow = (m: MealLog): MealLogRow => ({
  id: m.id,
  user_id: m.userId,
  log_date: m.logDate,
  meal_slot: m.mealSlot as MealSlot,
  description: m.description,
  calories: numOrNull(m.calories),
  protein_g: numOrNull(m.proteinG),
  carbs_g: numOrNull(m.carbsG),
  fat_g: numOrNull(m.fatG),
  is_completed: m.isCompleted,
  completed_at: isoOrNull(m.completedAt),
  created_at: iso(m.createdAt),
  updated_at: iso(m.updatedAt),
});

export const toWaterLogRow = (w: WaterLog): WaterLogRow => ({
  id: w.id,
  user_id: w.userId,
  log_date: w.logDate,
  amount_ml: w.amountMl,
  logged_at: iso(w.loggedAt),
});

export const toPostRow = (p: Post): PostRow => ({
  id: p.id,
  user_id: p.userId,
  meal_log_id: p.mealLogId,
  body: p.body,
  visibility: p.visibility as PostVisibility,
  is_hidden: p.isHidden,
  hidden_reason: p.hiddenReason,
  created_at: iso(p.createdAt),
  updated_at: iso(p.updatedAt),
});

export const toFaqItemRow = (f: FaqItem): FaqItemRow => ({
  id: f.id,
  question: f.question,
  answer: f.answer,
  category: f.category,
  order_index: f.orderIndex,
  is_published: f.isPublished,
  created_at: iso(f.createdAt),
  updated_at: iso(f.updatedAt),
});

export const toCalendarReminderRow = (r: CalendarReminder): CalendarReminderRow => ({
  id: r.id,
  user_id: r.userId,
  kind: r.kind as ReminderKind,
  title: r.title,
  days_of_week: r.daysOfWeek,
  local_time: r.localTime.slice(0, 5),
  duration_minutes: r.durationMinutes,
  timezone: r.timezone,
  google_event_id: r.googleEventId,
  is_active: r.isActive,
  synced_at: isoOrNull(r.syncedAt),
  last_sync_error: r.lastSyncError,
  created_at: iso(r.createdAt),
  updated_at: iso(r.updatedAt),
});

/** Só o que é seguro expor sem login (settings completos são do master). */
export function toPublicSettings(s: AppSettings): PublicSettings {
  const whatsappUrl = s.supportWhatsapp
    ? `https://wa.me/${s.supportWhatsapp}${
        s.supportWhatsappMessage ? `?text=${encodeURIComponent(s.supportWhatsappMessage)}` : ""
      }`
    : null;

  return {
    trial_days: s.trialDays,
    support_whatsapp_url: whatsappUrl,
  };
}
