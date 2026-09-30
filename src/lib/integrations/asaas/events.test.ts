import { describe, expect, it } from "vitest";
import { addOneMonth, asaasEventTime, mapAsaasEvent, type AsaasWebhookPayload } from "./events";

const payment = { id: "pay_1", customer: "cus_1", subscription: "sub_1", dueDate: "2026-10-05" };
const evt = (event: string, extra: Partial<AsaasWebhookPayload> = {}): AsaasWebhookPayload => ({
  id: `evt_${event}`,
  event,
  payment,
  ...extra,
});

describe("addOneMonth", () => {
  it("mês comum", () => expect(addOneMonth("2026-10-05")).toBe("2026-11-05"));
  it("virada de ano", () => expect(addOneMonth("2026-12-15")).toBe("2027-01-15"));
  it("fim de mês não transborda", () => {
    expect(addOneMonth("2026-01-31")).toBe("2026-02-28");
    expect(addOneMonth("2028-01-31")).toBe("2028-02-29");
  });
});

describe("mapAsaasEvent", () => {
  it("usa dateCreated para ordenar eventos mesmo quando chegam invertidos", () => {
    const newer = asaasEventTime(evt("PAYMENT_RECEIVED", { dateCreated: "2026-09-29T13:00:00-03:00" }));
    const older = asaasEventTime(evt("PAYMENT_OVERDUE", { dateCreated: "2026-09-28T13:00:00-03:00" }));
    expect(older.getTime()).toBeLessThan(newer.getTime());
    expect(asaasEventTime(evt("PAYMENT_RECEIVED", { dateCreated: "inválido" }), newer)).toEqual(newer);
  });
  it("pagamento confirmado/recebido → active com fim do período", () => {
    for (const e of ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]) {
      expect(mapAsaasEvent(evt(e))).toEqual({
        kind: "set_status",
        status: "active",
        currentPeriodEnd: "2026-11-05T23:59:59-03:00",
        requireCurrentSubscription: false,
      });
    }
  });

  it("atraso → past_due só na assinatura atual", () => {
    expect(mapAsaasEvent(evt("PAYMENT_OVERDUE"))).toMatchObject({
      status: "past_due",
      requireCurrentSubscription: true,
    });
  });

  it("estorno, chargeback e fim de assinatura → canceled", () => {
    for (const e of ["PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED", "SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED"]) {
      expect(mapAsaasEvent(evt(e))).toMatchObject({ kind: "set_status", status: "canceled" });
    }
  });

  it("eventos informativos são ignorados", () => {
    expect(mapAsaasEvent(evt("PAYMENT_CREATED")).kind).toBe("ignore");
    expect(mapAsaasEvent(evt("PAYMENT_UPDATED")).kind).toBe("ignore");
  });

  it("pagamento confirmado sem dueDate é ignorado (não inventa período)", () => {
    expect(mapAsaasEvent(evt("PAYMENT_CONFIRMED", { payment: { id: "p", customer: "c" } })).kind).toBe("ignore");
  });
});
