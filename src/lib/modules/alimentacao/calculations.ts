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

export type NutritionGoal = "emagrecer" | "manter" | "ganhar";

/**
 * Pisos de segurança para dieta sem acompanhamento clínico — abaixo disso a
 * recomendação não desce, mesmo com TDEE baixo.
 */
export const MIN_SAFE_KCAL: Record<Sex, number> = { M: 1500, F: 1200 };

const GOAL_FACTORS: Record<NutritionGoal, number> = {
  emagrecer: 0.8, // déficit de 20%
  manter: 1,
  ganhar: 1.1, // superávit de 10%
};

/**
 * Meta diária recomendada = TDEE ajustado pelo objetivo, arredondada para
 * múltiplo de 10 e nunca abaixo do piso do sexo. É derivada, nunca gravada
 * (o peso muda, a meta acompanha).
 */
export function calculateRecommendedCalories(input: {
  tdee: number;
  goal: NutritionGoal;
  sex: Sex;
}): number {
  const target = input.tdee * GOAL_FACTORS[input.goal];
  const floored = Math.max(target, MIN_SAFE_KCAL[input.sex]);
  return Math.round(floored / 10) * 10;
}

/** Proteína por kg de peso corporal, conforme o objetivo. */
const PROTEIN_G_PER_KG: Record<NutritionGoal, number> = {
  emagrecer: 1.8, // preserva massa magra em déficit
  manter: 1.6,
  ganhar: 1.8,
};
const FAT_SHARE = 0.25; // 25% das calorias

export type MacroTargets = { protein_g: number; carbs_g: number; fat_g: number };

/**
 * Metas diárias de macros a partir da meta calórica: proteína por kg,
 * gordura = 25% das kcal, carboidrato = o que sobra (nunca negativo).
 * Gramas inteiros — é o que o usuário consegue acompanhar.
 */
export function calculateMacroTargets(input: {
  kcal: number;
  weightKg: number;
  goal: NutritionGoal;
}): MacroTargets {
  const protein = Math.round(input.weightKg * PROTEIN_G_PER_KG[input.goal]);
  const fat = Math.round((input.kcal * FAT_SHARE) / 9);
  const carbs = Math.max(0, Math.round((input.kcal - protein * 4 - fat * 9) / 4));
  return { protein_g: protein, carbs_g: carbs, fat_g: fat };
}

/**
 * Meta em destaque e aviso de pouca ingestão (roadmap, Fase 0).
 *
 * Para quem usa medicação que reduz o apetite, o risco não é comer demais —
 * é comer DE MENOS e perder músculo. Por isso:
 * - o destaque passa a ser a PROTEÍNA (o déficit de calorias sai do foco);
 * - abaixo do mínimo seguro aparece "hoje você comeu pouco".
 * O aviso só vale com o dia já avançado (18h+) ou em dia passado, e só se
 * houve algum registro — dia sem registro é "não registrou", não "não comeu".
 * Isto é orientação de rotina alimentar, nunca de tratamento.
 */
export function getIntakeGuidance(input: {
  usesMedication: boolean;
  sex: Sex;
  consumedKcal: number;
  completedMeals: number;
  isToday: boolean;
  nowTime: string; // "HH:MM" no fuso do usuário
}): { focus: "proteina" | "calorias"; min_kcal: number; low_intake_warning: boolean } {
  const min = MIN_SAFE_KCAL[input.sex];
  const dayIsMostlyOver = !input.isToday || input.nowTime >= "18:00";
  return {
    focus: input.usesMedication ? "proteina" : "calorias",
    min_kcal: min,
    low_intake_warning:
      input.usesMedication && input.completedMeals > 0 && dayIsMostlyOver && input.consumedKcal < min,
  };
}
