import { describe, expect, it } from "vitest";
import { computeSessionVolume, getNextDayLabel } from "./calculations";

describe("getNextDayLabel", () => {
  it("começa em A quando não há sessão anterior", () => {
    expect(getNextDayLabel(null)).toBe("A");
  });

  it("alterna de A para B", () => {
    expect(getNextDayLabel("A")).toBe("B");
  });

  it("alterna de B para A", () => {
    expect(getNextDayLabel("B")).toBe("A");
  });
});

describe("computeSessionVolume", () => {
  it("soma as repetições de todas as séries", () => {
    expect(
      computeSessionVolume([
        { repsDone: 10 },
        { repsDone: 8 },
        { repsDone: 6 },
      ]),
    ).toBe(24);
  });

  it("retorna 0 para uma sessão sem séries registradas", () => {
    expect(computeSessionVolume([])).toBe(0);
  });
});
