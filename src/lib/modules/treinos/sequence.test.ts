import { describe, expect, it } from "vitest";
import { getNextWorkout, scaleNutrients } from "./sequence";

const abc = [
  { id: "a", sequence: 1 },
  { id: "b", sequence: 2 },
  { id: "c", sequence: 3 },
];
const log = (id: string, day: string, at = "12:00") => ({ programWorkoutId: id, performedOn: day, createdAt: `${day}T${at}` });

describe("getNextWorkout — rotina (cicla)", () => {
  it("sem registros → primeiro", () => {
    expect(getNextWorkout(abc, [], false).next?.id).toBe("a");
  });

  it("segue o último feito, não o calendário", () => {
    expect(getNextWorkout(abc, [log("a", "2026-09-01"), log("b", "2026-09-10")], false).next?.id).toBe("c");
  });

  it("depois do último volta ao primeiro", () => {
    expect(getNextWorkout(abc, [log("c", "2026-09-10")], false).next?.id).toBe("a");
  });

  it("dois treinos no mesmo dia: vale o registrado por último", () => {
    expect(getNextWorkout(abc, [log("b", "2026-09-10", "18:00"), log("a", "2026-09-10", "08:00")], false).next?.id).toBe("c");
  });

  it("rotina nunca 'conclui'", () => {
    expect(getNextWorkout(abc, [log("a", "d1"), log("b", "d2"), log("c", "d3")], false).programCompleted).toBe(false);
  });
});

describe("getNextWorkout — progressão linear (corrida)", () => {
  it("próximo = primeira sessão não feita, mesmo fora de ordem", () => {
    const r = getNextWorkout(abc, [log("a", "d1"), log("c", "d2")], true);
    expect(r.next?.id).toBe("b");
    expect(r.completedCount).toBe(2);
  });

  it("todas feitas → concluído", () => {
    const r = getNextWorkout(abc, [log("a", "d1"), log("b", "d2"), log("c", "d3")], true);
    expect(r.next).toBeNull();
    expect(r.programCompleted).toBe(true);
  });
});

describe("scaleNutrients", () => {
  it("multiplica e arredonda a 1 casa", () => {
    expect(scaleNutrients({ kcal: 128, protein_g: 2.5, carbs_g: 28.1, fat_g: 0.2 }, 1.5)).toEqual({
      kcal: 192,
      protein_g: 3.8,
      carbs_g: 42.2,
      fat_g: 0.3,
    });
  });
});
