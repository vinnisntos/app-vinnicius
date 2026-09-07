import { describe, expect, it } from "vitest";
import { calculateBMR, calculateDeficit, calculateTDEE } from "./calculations";

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
