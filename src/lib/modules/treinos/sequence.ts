/**
 * Próximo treino de um programa — pela SEQUÊNCIA, não pelo calendário
 * ("perdeu um dia? continue de onde parou"). Regra pura, testada.
 *
 * - Progressão linear (programa com `duration_weeks`, ex.: corrida 5K):
 *   próximo = primeira sessão ainda não feita; todas feitas = concluído.
 * - Rotina (sem `duration_weeks`, ex.: ABC): cicla. Próximo = o seguinte ao
 *   último treino registrado; nenhum registro = o primeiro.
 */
export interface SequenceWorkout {
  id: string;
  sequence: number;
}

export interface SequenceLog {
  programWorkoutId: string;
  performedOn: string;
  createdAt: string; // desempate de ordem no mesmo dia
}

export function getNextWorkout<T extends SequenceWorkout>(
  workouts: T[],
  logs: SequenceLog[],
  linear: boolean,
): { next: T | null; completedCount: number; programCompleted: boolean } {
  const ordered = [...workouts].sort((a, b) => a.sequence - b.sequence);
  if (ordered.length === 0) return { next: null, completedCount: 0, programCompleted: false };

  const doneIds = new Set(logs.map((l) => l.programWorkoutId));

  if (linear) {
    const completedCount = ordered.filter((w) => doneIds.has(w.id)).length;
    const next = ordered.find((w) => !doneIds.has(w.id)) ?? null;
    return { next, completedCount, programCompleted: next === null };
  }

  const last = [...logs].sort((a, b) =>
    a.performedOn === b.performedOn ? a.createdAt.localeCompare(b.createdAt) : a.performedOn.localeCompare(b.performedOn),
  ).at(-1);
  const lastIndex = last ? ordered.findIndex((w) => w.id === last.programWorkoutId) : -1;
  return {
    next: ordered[(lastIndex + 1) % ordered.length],
    completedCount: logs.length,
    programCompleted: false,
  };
}

/** Porção × quantidade, arredondado a 1 casa (o que o usuário enxerga). */
export function scaleNutrients<T extends { kcal: number; protein_g: number; carbs_g: number; fat_g: number }>(
  per: T,
  servings: number,
) {
  const r = (v: number) => Math.round(v * servings * 10) / 10;
  return { kcal: r(per.kcal), protein_g: r(per.protein_g), carbs_g: r(per.carbs_g), fat_g: r(per.fat_g) };
}
