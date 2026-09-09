import { describe, expect, it } from "vitest";
import {
  computeMonthBalance,
  getMonthDateRange,
  getYearMonth,
} from "./calculations";

describe("computeMonthBalance", () => {
  it("soma receitas fixa e variável, subtrai despesas", () => {
    const result = computeMonthBalance([
      { type: "receita_fixa", amount: 1500 },
      { type: "receita_variavel", amount: 800 },
      { type: "despesa", amount: 600 },
      { type: "despesa", amount: 200 },
    ]);
    expect(result).toEqual({
      totalFixedIncome: 1500,
      totalVariableIncome: 800,
      totalExpenses: 800,
      balance: 1500,
    });
  });

  it("retorna tudo zerado para uma lista vazia", () => {
    expect(computeMonthBalance([])).toEqual({
      totalFixedIncome: 0,
      totalVariableIncome: 0,
      totalExpenses: 0,
      balance: 0,
    });
  });

  it("saldo fica negativo quando despesas superam receitas", () => {
    const result = computeMonthBalance([
      { type: "receita_variavel", amount: 300 },
      { type: "despesa", amount: 900 },
    ]);
    expect(result.balance).toBe(-600);
  });
});

describe("getMonthDateRange", () => {
  it("calcula o último dia certo em meses de 31 dias", () => {
    expect(getMonthDateRange("2026-01")).toEqual({
      start: "2026-01-01",
      end: "2026-01-31",
    });
  });

  it("calcula o último dia certo em fevereiro bissexto", () => {
    expect(getMonthDateRange("2028-02")).toEqual({
      start: "2028-02-01",
      end: "2028-02-29",
    });
  });

  it("calcula o último dia certo em fevereiro não bissexto", () => {
    expect(getMonthDateRange("2026-02")).toEqual({
      start: "2026-02-01",
      end: "2026-02-28",
    });
  });
});

describe("getYearMonth", () => {
  it("extrai YYYY-MM de uma data ISO", () => {
    expect(getYearMonth("2026-09-15")).toBe("2026-09");
  });
});
