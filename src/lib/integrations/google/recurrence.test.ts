import { describe, expect, it } from "vitest";
import { buildEventPayload, buildRrule, nextOccurrence, nowInTimezone, weekdayOf } from "./recurrence";

describe("weekdayOf", () => {
  it("2026-09-29 é terça (2)", () => expect(weekdayOf("2026-09-29")).toBe(2));
});

describe("nextOccurrence", () => {
  const base = { today: "2026-09-29", daysOfWeek: [1, 3, 5] }; // terça; seg/qua/sex

  it("hoje não está nos dias → próximo dia marcado", () => {
    expect(nextOccurrence({ ...base, nowTime: "06:00", localTime: "07:00" })).toBe("2026-09-30");
  });

  it("hoje está nos dias e o horário ainda não passou → hoje", () => {
    expect(nextOccurrence({ today: "2026-09-29", daysOfWeek: [2], nowTime: "06:00", localTime: "07:00" })).toBe("2026-09-29");
  });

  it("hoje está nos dias mas o horário já passou → semana que vem", () => {
    expect(nextOccurrence({ today: "2026-09-29", daysOfWeek: [2], nowTime: "08:00", localTime: "07:00" })).toBe("2026-10-06");
  });

  it("vira o mês", () => {
    expect(nextOccurrence({ today: "2026-09-30", daysOfWeek: [4], nowTime: "23:00", localTime: "07:00" })).toBe("2026-10-01");
  });
});

describe("buildRrule", () => {
  it("ordena e remove duplicados", () => {
    expect(buildRrule([5, 1, 3, 1])).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR");
  });
  it("domingo e sábado", () => expect(buildRrule([6, 0])).toBe("RRULE:FREQ=WEEKLY;BYDAY=SU,SA"));
});

describe("buildEventPayload", () => {
  it("evento recorrente com popup no horário", () => {
    const e = buildEventPayload({
      title: "Treino",
      appUrl: "https://app.test",
      path: "/treinos",
      startDate: "2026-09-30",
      localTime: "07:00",
      durationMinutes: 45,
      timezone: "America/Sao_Paulo",
      daysOfWeek: [1, 3, 5],
    });
    expect(e.start).toEqual({ dateTime: "2026-09-30T07:00:00", timeZone: "America/Sao_Paulo" });
    expect(e.end.dateTime).toBe("2026-09-30T07:45:00");
    expect(e.recurrence).toEqual(["RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"]);
    expect(e.reminders.overrides).toEqual([{ method: "popup", minutes: 0 }]);
    expect(e.description).toContain("https://app.test/treinos");
  });

  it("fim atravessa a meia-noite", () => {
    const e = buildEventPayload({
      title: "Ceia",
      appUrl: "https://app.test",
      path: "/",
      startDate: "2026-09-30",
      localTime: "23:40",
      durationMinutes: 30,
      timezone: "America/Sao_Paulo",
      daysOfWeek: [3],
    });
    expect(e.end.dateTime).toBe("2026-10-01T00:10:00");
  });
});

describe("nowInTimezone", () => {
  it("converte UTC para o fuso de São Paulo (UTC-3)", () => {
    expect(nowInTimezone("America/Sao_Paulo", new Date("2026-09-30T02:30:00Z"))).toEqual({
      date: "2026-09-29",
      time: "23:30",
    });
  });
});
