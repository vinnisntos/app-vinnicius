import type {
  BodyMeasurement,
  Food,
  MealLogItem,
  Medication,
  MedicationLog,
  ProgramExercise,
  ProgramWorkoutLog,
  Tip,
} from "@/lib/db/schema";
import type {
  BodyMeasurementRow,
  DoseUnit,
  FoodCategory,
  FoodRow,
  InjectionSite,
  MealLogItemRow,
  MedicationCategory,
  MedicationFrequency,
  MedicationLogRow,
  MedicationRoute,
  MedicationRow,
  ProgramExerciseRow,
  ProgramWorkoutLogRow,
  SideEffect,
  TipCategory,
  TipRow,
} from "@/types/database";

/** Mesmo papel de mappers.ts, para as tabelas da migration 0005. */

const iso = (d: Date) => d.toISOString();
const num = (v: string) => Number(v);
const numOrNull = (v: string | null) => (v == null ? null : Number(v));

export const toMedicationRow = (m: Medication): MedicationRow => ({
  id: m.id,
  user_id: m.userId,
  name: m.name,
  category: m.category as MedicationCategory,
  route: m.route as MedicationRoute,
  dose_amount: numOrNull(m.doseAmount),
  dose_unit: m.doseUnit as DoseUnit,
  frequency: m.frequency as MedicationFrequency,
  days_of_week: m.daysOfWeek,
  started_on: m.startedOn,
  is_active: m.isActive,
  prescribed_by: m.prescribedBy,
  notes: m.notes,
  created_at: iso(m.createdAt),
  updated_at: iso(m.updatedAt),
});

export const toMedicationLogRow = (l: MedicationLog): MedicationLogRow => ({
  id: l.id,
  user_id: l.userId,
  medication_id: l.medicationId,
  log_date: l.logDate,
  taken_at: iso(l.takenAt),
  dose_amount: numOrNull(l.doseAmount),
  dose_unit: l.doseUnit as DoseUnit | null,
  injection_site: l.injectionSite as InjectionSite | null,
  side_effects: l.sideEffects as SideEffect[],
  severity: l.severity as 0 | 1 | 2 | 3,
  notes: l.notes,
  created_at: iso(l.createdAt),
});

export const toBodyMeasurementRow = (b: BodyMeasurement): BodyMeasurementRow => ({
  id: b.id,
  user_id: b.userId,
  logged_at: b.loggedAt,
  waist_cm: numOrNull(b.waistCm),
  hip_cm: numOrNull(b.hipCm),
  chest_cm: numOrNull(b.chestCm),
  arm_cm: numOrNull(b.armCm),
  thigh_cm: numOrNull(b.thighCm),
  neck_cm: numOrNull(b.neckCm),
  body_fat_pct: numOrNull(b.bodyFatPct),
  notes: b.notes,
  created_at: iso(b.createdAt),
});

export const toFoodRow = (f: Food): FoodRow => ({
  id: f.id,
  name: f.name,
  category: f.category as FoodCategory,
  portion_label: f.portionLabel,
  portion_g: num(f.portionG),
  kcal: num(f.kcal),
  protein_g: num(f.proteinG),
  carbs_g: num(f.carbsG),
  fat_g: num(f.fatG),
  source: f.source,
});

export const toMealLogItemRow = (i: MealLogItem): MealLogItemRow => ({
  id: i.id,
  meal_log_id: i.mealLogId,
  food_id: i.foodId,
  name: i.name,
  servings: num(i.servings),
  kcal: num(i.kcal),
  protein_g: num(i.proteinG),
  carbs_g: num(i.carbsG),
  fat_g: num(i.fatG),
  created_at: iso(i.createdAt),
});

export const toProgramExerciseRow = (e: ProgramExercise): ProgramExerciseRow => ({
  id: e.id,
  order_index: e.orderIndex,
  name: e.name,
  sets: e.sets,
  reps: e.reps,
  rest_seconds: e.restSeconds,
  duration_seconds: e.durationSeconds,
  distance_m: e.distanceM,
  intensity: e.intensity,
  notes: e.notes,
});

export const toProgramWorkoutLogRow = (l: ProgramWorkoutLog): ProgramWorkoutLogRow => ({
  id: l.id,
  program_workout_id: l.programWorkoutId,
  performed_on: l.performedOn,
  duration_minutes: l.durationMinutes,
  effort: l.effort as ProgramWorkoutLogRow["effort"],
  notes: l.notes,
  exercise_results: l.exerciseResults as ProgramWorkoutLogRow["exercise_results"],
  created_at: iso(l.createdAt),
});

export const toTipRow = (t: Tip): TipRow => ({
  id: t.id,
  title: t.title,
  body: t.body,
  category: t.category as TipCategory,
  read_minutes: t.readMinutes,
  published_at: iso(t.publishedAt),
});
