import { and, asc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { toBodyMeasurementRow } from "@/lib/api/mappers-health";
import { db } from "@/lib/db/client";
import { bodyMeasurements, weightLogs } from "@/lib/db/schema";
import { getTodayIsoDate } from "@/lib/date";
import { isoDate } from "@/lib/modules/alimentacao/api-schema";
import { getUserTimezone } from "@/lib/modules/conta/repository";
import type { BodyMeasurementRow, ProgressResponse } from "@/types/database";

/** Documentação da progressão: peso, medidas e constância. */

export const progressQuery = z.object({ days: z.coerce.number().int().min(7).max(365).default(90) });

const cm = (min: number, max: number) => z.number().min(min).max(max).nullable().optional();
export const measurementSchema = z
  .object({
    logged_at: isoDate,
    waist_cm: cm(30, 250),
    hip_cm: cm(30, 250),
    chest_cm: cm(30, 250),
    arm_cm: cm(10, 100),
    thigh_cm: cm(20, 150),
    neck_cm: cm(15, 80),
    body_fat_pct: cm(2, 70),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine(
    (v) => ["waist_cm", "hip_cm", "chest_cm", "arm_cm", "thigh_cm", "neck_cm", "body_fat_pct"].some(
      (k) => v[k as keyof typeof v] != null,
    ),
    { message: "Informe ao menos uma medida.", path: ["waist_cm"] },
  );
export type MeasurementInput = z.infer<typeof measurementSchema>;

function isoDaysAgo(today: string, days: number) {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function upsertMeasurement(userId: string, input: MeasurementInput): Promise<BodyMeasurementRow> {
  const n = (v: number | null | undefined) => (v == null ? null : v.toString());
  const values = {
    waistCm: n(input.waist_cm),
    hipCm: n(input.hip_cm),
    chestCm: n(input.chest_cm),
    armCm: n(input.arm_cm),
    thighCm: n(input.thigh_cm),
    neckCm: n(input.neck_cm),
    bodyFatPct: n(input.body_fat_pct),
    notes: input.notes ?? null,
  };
  // No upsert, só sobrescreve o que veio preenchido (medir só a cintura não apaga o quadril do dia).
  const update = Object.fromEntries(
    Object.entries(values).filter(([k]) => {
      const key = { waistCm: "waist_cm", hipCm: "hip_cm", chestCm: "chest_cm", armCm: "arm_cm", thighCm: "thigh_cm", neckCm: "neck_cm", bodyFatPct: "body_fat_pct", notes: "notes" }[k] as keyof MeasurementInput;
      return input[key] !== undefined;
    }),
  );
  const [row] = await db
    .insert(bodyMeasurements)
    .values({ userId, loggedAt: input.logged_at, ...values })
    .onConflictDoUpdate({ target: [bodyMeasurements.userId, bodyMeasurements.loggedAt], set: update })
    .returning();
  return toBodyMeasurementRow(row);
}

export async function getProgress(userId: string, days: number): Promise<ProgressResponse> {
  const today = getTodayIsoDate(await getUserTimezone(userId));
  const since = isoDaysAgo(today, days);
  const since30 = isoDaysAgo(today, 30);

  const [weights, measurements, consistency] = await Promise.all([
    db
      .select({ date: weightLogs.loggedAt, weight: weightLogs.weightKg })
      .from(weightLogs)
      .where(and(eq(weightLogs.userId, userId), gte(weightLogs.loggedAt, since)))
      .orderBy(asc(weightLogs.loggedAt)),
    db
      .select()
      .from(bodyMeasurements)
      .where(and(eq(bodyMeasurements.userId, userId), gte(bodyMeasurements.loggedAt, since)))
      .orderBy(asc(bodyMeasurements.loggedAt)),
    db.execute<{ meal_days: number; water_goal_days: number; workouts: number; medication_doses: number }>(sql`
      select
        (select count(distinct log_date)::int from public.meal_logs
          where user_id = ${userId} and is_completed and log_date >= ${since30}) as meal_days,
        (select count(*)::int from (
            select w.log_date from public.water_logs w
            where w.user_id = ${userId} and w.log_date >= ${since30}
            group by w.log_date
            having sum(w.amount_ml) >= coalesce(
              (select water_goal_ml from public.nutrition_profile where user_id = ${userId}), 3000)
          ) t) as water_goal_days,
        (select count(*)::int from public.program_workout_logs
          where user_id = ${userId} and performed_on >= ${since30}) as workouts,
        (select count(*)::int from public.medication_logs
          where user_id = ${userId} and log_date >= ${since30}) as medication_doses
    `),
  ]);

  const weightSeries = weights.map((w) => ({ date: w.date, weight_kg: Number(w.weight) }));
  const waists = measurements.filter((m) => m.waistCm != null).map((m) => Number(m.waistCm));
  const change = (series: number[]) =>
    series.length >= 2 ? Math.round((series[series.length - 1] - series[0]) * 10) / 10 : null;

  return {
    range_days: days,
    weights: weightSeries,
    measurements: measurements.map(toBodyMeasurementRow),
    weight_change_kg: change(weightSeries.map((w) => w.weight_kg)),
    waist_change_cm: change(waists),
    consistency: consistency[0],
  };
}
