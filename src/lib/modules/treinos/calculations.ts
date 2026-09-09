/**
 * Regra de negócio pura do módulo Treinos — sem I/O, fácil de testar
 * isoladamente (ver `calculations.test.ts`). Contratos documentados em
 * docs/04-api-contratos.md#treinos.
 */

export const DAY_LABELS = ["A", "B"] as const;
export type DayLabel = (typeof DAY_LABELS)[number];

export type SetLogInput = { repsDone: number };

/**
 * Alterna A/B a partir do dia da última sessão. Sem sessão anterior, começa
 * em A. Não há tabela de "próximo dia" — é sempre derivado.
 */
export function getNextDayLabel(lastSessionDayLabel: DayLabel | null): DayLabel {
  return lastSessionDayLabel === "A" ? "B" : "A";
}

/** Volume de uma sessão = soma de repetições feitas em todas as séries. */
export function computeSessionVolume(setLogs: SetLogInput[]): number {
  return setLogs.reduce((sum, set) => sum + set.repsDone, 0);
}
