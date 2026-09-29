import { describe, expect, it } from "vitest";
import { getNagMode, getTrialCountdown, shouldShowNagPopup } from "./nag";

describe("getNagMode", () => {
  it("assinante/master: sem nag", () => {
    expect(getNagMode({ show_nag_screen: false, has_access: true })).toBe("none");
  });
  it("trial vigente: nag dispensável", () => {
    expect(getNagMode({ show_nag_screen: true, has_access: true })).toBe("soft");
  });
  it("trial expirado/revogado: paywall bloqueante", () => {
    expect(getNagMode({ show_nag_screen: true, has_access: false })).toBe("blocking");
  });
});

describe("getTrialCountdown", () => {
  const access = {
    server_now: "2026-09-29T12:00:00.000Z",
    trial_ends_at: "2026-10-01T15:30:00.000Z",
  };

  it("usa o relógio do servidor, não o do aparelho", () => {
    // Aparelho adiantado 5h: não pode afetar o resultado.
    const received = Date.parse("2026-09-29T17:00:00.000Z");
    const c = getTrialCountdown(access, received, received)!;
    expect(c.days).toBe(2);
    expect(c.hours).toBe(3);
    expect(c.minutes).toBe(30);
    expect(c.isLastDay).toBe(false);
  });

  it("desconta o tempo decorrido desde a resposta", () => {
    const received = 1_000_000;
    const c = getTrialCountdown(access, received, received + 2 * 86_400_000)!;
    expect(c.days).toBe(0);
    expect(c.hours).toBe(3);
    expect(c.isLastDay).toBe(true);
  });

  it("nunca negativo depois do fim", () => {
    const c = getTrialCountdown(access, 0, 10 * 86_400_000)!;
    expect(c.msLeft).toBe(0);
    expect(c.expired).toBe(true);
    expect(c.isLastDay).toBe(false);
  });

  it("sem trial_ends_at → null", () => {
    expect(getTrialCountdown({ ...access, trial_ends_at: null }, 0, 0)).toBeNull();
  });
});

describe("shouldShowNagPopup", () => {
  const now = 100 * 3_600_000;
  it("bloqueante sempre aparece", () => {
    expect(shouldShowNagPopup("blocking", null, now, now)).toBe(true);
  });
  it("sem nag nunca aparece", () => {
    expect(shouldShowNagPopup("none", null, null, now)).toBe(false);
  });
  it("trial: primeira vez aparece; depois só a cada 6h", () => {
    expect(shouldShowNagPopup("soft", null, null, now)).toBe(true);
    expect(shouldShowNagPopup("soft", null, now - 3_600_000, now)).toBe(false);
    expect(shouldShowNagPopup("soft", null, now - 7 * 3_600_000, now)).toBe(true);
  });
  it("último dia: a cada 10 min", () => {
    const lastDay = { isLastDay: true } as Parameters<typeof shouldShowNagPopup>[1];
    expect(shouldShowNagPopup("soft", lastDay, now - 11 * 60_000, now)).toBe(true);
    expect(shouldShowNagPopup("soft", lastDay, now - 5 * 60_000, now)).toBe(false);
  });
});
