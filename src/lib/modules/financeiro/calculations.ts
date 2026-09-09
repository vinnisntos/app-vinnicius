/**
 * Regra de negócio pura do módulo Financeiro — sem I/O, fácil de testar
 * isoladamente (ver `calculations.test.ts`). Contratos documentados em
 * docs/04-api-contratos.md#financeiro.
 */

export const TRANSACTION_TYPES = [
  "receita_fixa",
  "receita_variavel",
  "despesa",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export type TransactionAmount = { type: TransactionType; amount: number };

export type MonthBalance = {
  totalFixedIncome: number;
  totalVariableIncome: number;
  totalExpenses: number;
  balance: number;
};

/**
 * `amount` é sempre positivo no banco — o sinal vem do `type`
 * (receita_* soma, despesa subtrai). Nunca fazer essa conta em SQL direto;
 * centralizar aqui evita a mesma regra duplicada em cada query.
 */
export function computeMonthBalance(transactions: TransactionAmount[]): MonthBalance {
  let totalFixedIncome = 0;
  let totalVariableIncome = 0;
  let totalExpenses = 0;

  for (const { type, amount } of transactions) {
    if (type === "receita_fixa") totalFixedIncome += amount;
    else if (type === "receita_variavel") totalVariableIncome += amount;
    else totalExpenses += amount;
  }

  return {
    totalFixedIncome,
    totalVariableIncome,
    totalExpenses,
    balance: totalFixedIncome + totalVariableIncome - totalExpenses,
  };
}

/** Primeiro e último dia (ISO) de um mês "YYYY-MM", sem passar por `Date`. */
export function getMonthDateRange(yearMonth: string): {
  start: string;
  end: string;
} {
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${yearMonth}-01`,
    end: `${yearMonth}-${pad(lastDay)}`,
  };
}

/** "YYYY-MM" do mês atual, a partir de uma data ISO "YYYY-MM-DD". */
export function getYearMonth(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Mês anterior a "YYYY-MM", sem passar por `Date` (evita fuso horário). */
export function getPreviousYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;
  return `${previousYear}-${String(previousMonth).padStart(2, "0")}`;
}

/**
 * Move uma data ISO para o mesmo dia em outro mês "YYYY-MM", limitando ao
 * último dia válido do mês alvo (ex.: dia 31 de janeiro vira dia 28/29 em
 * fevereiro) — usado para repetir transações recorrentes de um mês a outro.
 */
export function shiftDateToMonth(occurredOn: string, targetYearMonth: string): string {
  const day = Number(occurredOn.slice(8, 10));
  const { end } = getMonthDateRange(targetYearMonth);
  const lastDayOfTargetMonth = Number(end.slice(8, 10));
  const clampedDay = Math.min(day, lastDayOfTargetMonth);
  return `${targetYearMonth}-${String(clampedDay).padStart(2, "0")}`;
}
