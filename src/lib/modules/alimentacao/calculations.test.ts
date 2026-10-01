import { describe, expect, it } from "vitest";
import {
  calculateBMR,
  calculateDeficit,
  calculateMacroTargets,
  calculateRecommendedCalories,
  calculateTDEE,
  getIntakeGuidance,
} from "./calculations";

describe("calculateBMR (Mifflin-St Jeor)", () => {
  it("homem: soma +5", () => {
    const bmr = calculateBMR({
      sex: "M",
      weightKg: 80,
      heightCm: 180,
      birthDate: "1996-01-01",
      today: "2026-01-01",
    });
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5
    expect(bmr).toBeCloseTo(1780, 5);
  });

  it("mulher: subtrai 161", () => {
    const bmr = calculateBMR({
      sex: "F",
      weightKg: 65,
      heightCm: 165,
      birthDate: "1996-01-01",
      today: "2026-01-01",
    });
    // 10*65 + 6.25*165 - 5*30 - 161 = 650 + 1031.25 - 150 - 161
    expect(bmr).toBeCloseTo(1370.25, 5);
  });

  it("não soma o aniversário do ano corrente antes dele acontecer", () => {
    const bmrAntesDoAniversario = calculateBMR({
      sex: "M",
      weightKg: 80,
      heightCm: 180,
      birthDate: "2000-06-15",
      today: "2026-06-14", // véspera do aniversário — ainda 25 anos
    });
    const bmrNoDiaDoAniversario = calculateBMR({
      sex: "M",
      weightKg: 80,
      heightCm: 180,
      birthDate: "2000-06-15",
      today: "2026-06-15", // fez aniversário — 26 anos
    });
    // 1 ano de diferença = 5 kcal de diferença no BMR (o termo -5*idade)
    expect(bmrAntesDoAniversario - bmrNoDiaDoAniversario).toBeCloseTo(5, 5);
  });
});

describe("calculateTDEE", () => {
  it("aplica o fator de atividade sobre o BMR", () => {
    expect(calculateTDEE(1500, "sedentario")).toBeCloseTo(1800, 5);
    expect(calculateTDEE(1500, "muito_ativo")).toBeCloseTo(2850, 5);
  });
});

describe("calculateDeficit", () => {
  it("positivo quando consome menos que o TDEE (déficit)", () => {
    expect(calculateDeficit(2500, 2000)).toBe(500);
  });

  it("negativo quando consome mais que o TDEE (superávit)", () => {
    expect(calculateDeficit(2500, 3000)).toBe(-500);
  });
});

describe("calculateRecommendedCalories", () => {
  it("emagrecer: déficit de 20%, arredondado a 10", () => {
    expect(calculateRecommendedCalories({ tdee: 2500, goal: "emagrecer", sex: "M" })).toBe(2000);
    expect(calculateRecommendedCalories({ tdee: 2347, goal: "emagrecer", sex: "M" })).toBe(1880);
  });

  it("manter e ganhar", () => {
    expect(calculateRecommendedCalories({ tdee: 2000, goal: "manter", sex: "F" })).toBe(2000);
    expect(calculateRecommendedCalories({ tdee: 2000, goal: "ganhar", sex: "F" })).toBe(2200);
  });

  it("nunca abaixo do piso de segurança", () => {
    expect(calculateRecommendedCalories({ tdee: 1400, goal: "emagrecer", sex: "F" })).toBe(1200);
    expect(calculateRecommendedCalories({ tdee: 1700, goal: "emagrecer", sex: "M" })).toBe(1500);
  });
});

describe("calculateMacroTargets", () => {
  it("emagrecer: 1,8 g/kg de proteína, 25% gordura, carbo no restante", () => {
    // 70 kg → P 126 g (504 kcal); G 1560*0,25/9 = 43 g (387 kcal); C (1560-504-387)/4 = 167 g
    expect(calculateMacroTargets({ kcal: 1560, weightKg: 70, goal: "emagrecer" })).toEqual({
      protein_g: 126,
      fat_g: 43,
      carbs_g: 167,
    });
  });

  it("manter usa 1,6 g/kg", () => {
    expect(calculateMacroTargets({ kcal: 2000, weightKg: 80, goal: "manter" }).protein_g).toBe(128);
  });

  it("carboidrato nunca fica negativo", () => {
    expect(calculateMacroTargets({ kcal: 1200, weightKg: 150, goal: "emagrecer" }).carbs_g).toBe(0);
  });
});

describe("proteína de quem usa medicação", () => {
  it("1,8 g/kg mesmo com objetivo 'manter'", () => {
    expect(calculateMacroTargets({ kcal: 2000, weightKg: 80, goal: "manter" }).protein_g).toBe(128);
    expect(calculateMacroTargets({ kcal: 2000, weightKg: 80, goal: "manter", usesMedication: true }).protein_g).toBe(144);
  });
});

describe("getIntakeGuidance", () => {
  const base = { usesMedication: true, sex: "F" as const, consumedKcal: 700, completedMeals: 2, isToday: true, nowTime: "19:30" };

  it("quem usa medicação: foco em proteína", () => {
    expect(getIntakeGuidance(base).focus).toBe("proteina");
    expect(getIntakeGuidance({ ...base, usesMedication: false }).focus).toBe("calorias");
  });

  it("avisa 'comeu pouco' abaixo do mínimo, com o dia avançado", () => {
    expect(getIntakeGuidance(base)).toMatchObject({ min_kcal: 1200, low_intake_warning: true });
    expect(getIntakeGuidance({ ...base, sex: "M", consumedKcal: 1400 })).toMatchObject({ min_kcal: 1500, low_intake_warning: true });
  });

  it("não avisa cedo no dia, nem acima do mínimo", () => {
    expect(getIntakeGuidance({ ...base, nowTime: "11:00" }).low_intake_warning).toBe(false);
    expect(getIntakeGuidance({ ...base, consumedKcal: 1300 }).low_intake_warning).toBe(false);
  });

  it("dia sem nenhum registro não é 'comeu pouco'", () => {
    expect(getIntakeGuidance({ ...base, consumedKcal: 0, completedMeals: 0 }).low_intake_warning).toBe(false);
  });

  it("dia passado vale em qualquer hora", () => {
    expect(getIntakeGuidance({ ...base, isToday: false, nowTime: "08:00" }).low_intake_warning).toBe(true);
  });

  it("quem não usa medicação nunca recebe o aviso", () => {
    expect(getIntakeGuidance({ ...base, usesMedication: false }).low_intake_warning).toBe(false);
  });
});
