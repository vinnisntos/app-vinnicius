import { describe, expect, it } from "vitest";
import { getNextAction, getNextReminder, type NextActionInput } from "./next-action";

const base: NextActionInput = {
  today: "2026-09-29",
  nowTime: "12:00",
  hasProfile: true,
  completedSlots: ["cafe_da_manha"],
  waterTotalMl: 3000,
  waterGoalMl: 3000,
  latestWeightDate: "2026-09-28",
};

describe("getNextAction", () => {
  it("sem perfil → configurar perfil antes de tudo", () => {
    expect(getNextAction({ ...base, hasProfile: false })).toEqual({ kind: "setup_profile" });
  });

  it("dia de aplicação vem antes de tudo, inclusive do perfil", () => {
    expect(getNextAction({ ...base, medicationsDue: [{ id: "m1", name: "Semaglutida" }] })).toEqual({
      kind: "log_medication",
      medication_id: "m1",
      name: "Semaglutida",
    });
    expect(getNextAction({ ...base, hasProfile: false, medicationsDue: [{ id: "m1", name: "X" }] }).kind).toBe(
      "log_medication",
    );
  });

  it("refeição da janela atual pendente", () => {
    expect(getNextAction(base)).toEqual({ kind: "log_meal", meal_slot: "almoco", overdue: false });
  });

  it("janela atual feita → refeição atrasada mais recente", () => {
    expect(getNextAction({ ...base, nowTime: "16:00", completedSlots: ["lanche"] })).toEqual({
      kind: "log_meal",
      meal_slot: "almoco",
      overdue: true,
    });
  });

  it("ceia perdida não vira pendência", () => {
    expect(
      getNextAction({
        ...base,
        nowTime: "23:59",
        completedSlots: ["cafe_da_manha", "almoco", "lanche", "jantar"],
      }).kind,
    ).not.toBe("log_meal");
  });

  it("água atrás do ritmo → sugere múltiplo de 250 ml, máximo 500", () => {
    // 14:30 = metade do dia de água (07–22h): esperado 1500, tem 600 → atrás 900
    expect(
      getNextAction({ ...base, nowTime: "14:45", completedSlots: ["cafe_da_manha", "almoco"], waterTotalMl: 600 }),
    ).toMatchObject({ kind: "drink_water", suggested_ml: 500 });
  });

  it("água ligeiramente atrás (< 250 ml) não interrompe", () => {
    expect(
      getNextAction({ ...base, nowTime: "14:45", completedSlots: ["cafe_da_manha", "almoco"], waterTotalMl: 1500 }).kind,
    ).not.toBe("drink_water");
  });

  it("pesagem com 7+ dias → registrar peso", () => {
    expect(
      getNextAction({ ...base, nowTime: "14:45", completedSlots: ["cafe_da_manha", "almoco"], latestWeightDate: "2026-09-20" }),
    ).toEqual({ kind: "log_weight" });
  });

  it("tudo em dia", () => {
    expect(getNextAction({ ...base, nowTime: "14:45", completedSlots: ["cafe_da_manha", "almoco"] })).toEqual({
      kind: "all_done",
    });
  });
});

describe("getNextReminder", () => {
  const now = { today: "2026-09-29", nowTime: "08:00" }; // terça
  const reminders = [
    { kind: "treino" as const, title: "Treino", daysOfWeek: [1, 3, 5], localTime: "07:00", isActive: true },
    { kind: "agua" as const, title: "Água", daysOfWeek: [2], localTime: "10:00", isActive: true },
    { kind: "pesagem" as const, title: "Peso", daysOfWeek: [2], localTime: "09:00", isActive: false },
  ];

  it("escolhe o mais próximo entre os ativos", () => {
    expect(getNextReminder(reminders, now)).toEqual({ kind: "agua", title: "Água", date: "2026-09-29", time: "10:00" });
  });

  it("sem lembretes ativos → null", () => {
    expect(getNextReminder([], now)).toBeNull();
  });
});
