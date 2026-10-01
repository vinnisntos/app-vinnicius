import { describe, expect, it } from "vitest";
import { addMonths, buildExternalReference, monthlyEquivalent, parseExternalReference, periodEndFor, PLANS } from "./plans";

describe("planos", () => {
  it("preços definidos pelo dono do produto", () => {
    expect(PLANS.mensal.price).toBe(19.9);
    expect(PLANS.anual.price).toBe(149);
    expect(PLANS.fundador.price).toBe(67);
  });

  it("fundador é pagamento único no Pix, 12 meses, vagas limitadas", () => {
    expect(PLANS.fundador).toMatchObject({ recurring: false, pixOnly: true, months: 12, limitedSeats: true, asaasCycle: null });
  });

  it("equivalente mensal para ancorar o preço", () => {
    expect(monthlyEquivalent(PLANS.anual)).toBe(12.42);
    expect(monthlyEquivalent(PLANS.fundador)).toBe(5.58);
  });
});

describe("addMonths / periodEndFor", () => {
  it("soma meses virando o ano", () => {
    expect(addMonths("2026-10-01", 1)).toBe("2026-11-01");
    expect(addMonths("2026-10-01", 12)).toBe("2027-10-01");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  });

  it("fim de mês não transborda", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-02-29", 12)).toBe("2029-02-28");
  });

  it("período pago depende do plano", () => {
    expect(periodEndFor("2026-10-01", "mensal")).toBe("2026-11-01T23:59:59-03:00");
    expect(periodEndFor("2026-10-01", "anual")).toBe("2027-10-01T23:59:59-03:00");
    expect(periodEndFor("2026-10-01", "fundador")).toBe("2027-10-01T23:59:59-03:00");
  });
});

describe("externalReference", () => {
  const uid = "8d10559f-d2e0-49f4-89de-815fcf724e14";

  it("ida e volta", () => {
    expect(parseExternalReference(buildExternalReference(uid, "fundador"))).toEqual({ userId: uid, plan: "fundador" });
  });

  it("formato antigo (só o userId) continua aceito", () => {
    expect(parseExternalReference(uid)).toEqual({ userId: uid, plan: null });
  });

  it("lixo é descartado", () => {
    expect(parseExternalReference("abc|vitalicio")).toEqual({ userId: null, plan: null });
    expect(parseExternalReference(`${uid}|vitalicio`)).toEqual({ userId: uid, plan: null });
    expect(parseExternalReference(null)).toEqual({ userId: null, plan: null });
  });
});
