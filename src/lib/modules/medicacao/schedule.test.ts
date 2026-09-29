import { describe, expect, it } from "vitest";
import { isScheduledOn, nextDueDate, suggestInjectionSite, type ScheduleInput } from "./schedule";

// 2026-09-28 = segunda (1), 2026-09-29 = terça (2)
const weeklyMonday: ScheduleInput = { frequency: "semanal", daysOfWeek: [1], startedOn: "2026-09-01", isActive: true };

describe("isScheduledOn", () => {
  it("semanal: só nos dias marcados", () => {
    expect(isScheduledOn(weeklyMonday, "2026-09-28", null)).toBe(true);
    expect(isScheduledOn(weeklyMonday, "2026-09-29", null)).toBe(false);
  });

  it("diária: todo dia", () => {
    expect(isScheduledOn({ ...weeklyMonday, frequency: "diaria", daysOfWeek: null }, "2026-09-29", null)).toBe(true);
  });

  it("inativo ou antes do início: nunca", () => {
    expect(isScheduledOn({ ...weeklyMonday, isActive: false }, "2026-09-28", null)).toBe(false);
    expect(isScheduledOn({ ...weeklyMonday, startedOn: "2026-10-01" }, "2026-09-28", null)).toBe(false);
  });

  it("quinzenal: dia marcado e 13+ dias desde a última", () => {
    const biweekly = { ...weeklyMonday, frequency: "quinzenal" as const };
    expect(isScheduledOn(biweekly, "2026-09-28", "2026-09-21")).toBe(false); // 7 dias
    expect(isScheduledOn(biweekly, "2026-09-28", "2026-09-14")).toBe(true); // 14 dias
  });

  it("sem dias marcados (personalizada vazia): sem agenda", () => {
    expect(isScheduledOn({ ...weeklyMonday, frequency: "personalizada", daysOfWeek: [] }, "2026-09-28", null)).toBe(false);
  });
});

describe("nextDueDate", () => {
  it("hoje é dia e ainda não aplicou → hoje", () => {
    expect(nextDueDate(weeklyMonday, "2026-09-28", "2026-09-21")).toBe("2026-09-28");
  });

  it("já aplicou hoje → próxima semana", () => {
    expect(nextDueDate(weeklyMonday, "2026-09-28", "2026-09-28")).toBe("2026-10-05");
  });

  it("terça → próxima segunda", () => {
    expect(nextDueDate(weeklyMonday, "2026-09-29", "2026-09-28")).toBe("2026-10-05");
  });

  it("sem agenda → null", () => {
    expect(nextDueDate({ ...weeklyMonday, daysOfWeek: [] }, "2026-09-29", null)).toBeNull();
  });
});

describe("suggestInjectionSite", () => {
  it("primeira aplicação → começa o rodízio", () => {
    expect(suggestInjectionSite("subcutanea", [])).toBe("abdomen_esq");
  });

  it("segue a ordem e evita os 2 últimos locais", () => {
    expect(suggestInjectionSite("subcutanea", ["abdomen_esq"])).toBe("abdomen_dir");
    expect(suggestInjectionSite("subcutanea", ["abdomen_dir", "abdomen_esq"])).toBe("coxa_esq");
  });

  it("volta ao início do ciclo", () => {
    expect(suggestInjectionSite("subcutanea", ["braco_dir", "braco_esq"])).toBe("abdomen_esq");
  });

  it("via oral não tem local", () => {
    expect(suggestInjectionSite("oral", ["abdomen_esq"])).toBeNull();
  });
});
