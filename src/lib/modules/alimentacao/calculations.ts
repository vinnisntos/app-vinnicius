import { getTodayIsoDate } from "@/lib/date";

/**
 * Regra de negócio pura do módulo Alimentação — sem I/O, fácil de testar
 * isoladamente (ver `calculations.test.ts`). Fórmula documentada em
 * docs/04-api-contratos.md#alimentação.
 */

export type Sex = "M" | "F";

export type ActivityLevel =
  | "sedentario"
  | "leve"
  | "moderado"
  | "ativo"
  | "muito_ativo";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  ativo: 1.725,
  muito_ativo: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentario: "Sedentário",
  leve: "Leve (1-3x/semana)",
  moderado: "Moderado (3-5x/semana)",
  ativo: "Ativo (6-7x/semana)",
  muito_ativo: "Muito ativo (2x/dia ou trabalho físico)",
};

export const MEAL_SLOTS = [
  "cafe_da_manha",
  "almoco",
  "lanche",
  "jantar",
  "ceia",
] as const;

export type MealSlot = (typeof MEAL_SLOTS)[number];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  cafe_da_manha: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  ceia: "Ceia",
};

/**
 * Datas como string ISO "YYYY-MM-DD", nunca `Date` — evita o fuso horário
 * deslocar o dia (ex. `new Date("2000-06-15")` é meia-noite UTC, que vira
 * 14/06 em fusos negativos como o do Brasil).
 */
function ageInYears(birthDateIso: string, todayIso: string): number {
  const [by, bm, bd] = birthDateIso.split("-").map(Number);
  const [ty, tm, td] = todayIso.split("-").map(Number);

  let age = ty - by;
  const hasNotHadBirthdayYet = tm < bm || (tm === bm && td < bd);
  if (hasNotHadBirthdayYet) age -= 1;
  return age;
}

/** Mifflin-St Jeor. `birthDate`/`today` são strings ISO "YYYY-MM-DD". */
export function calculateBMR(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  birthDate: string;
  today?: string;
}): number {
  const age = ageInYears(input.birthDate, input.today ?? getTodayIsoDate());
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * age;
  return input.sex === "M" ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activityLevel];
}

/** TDEE - calorias consumidas hoje. Positivo = déficit, negativo = superávit. */
export function calculateDeficit(tdee: number, caloriesConsumedToday: number): number {
  return tdee - caloriesConsumedToday;
}
