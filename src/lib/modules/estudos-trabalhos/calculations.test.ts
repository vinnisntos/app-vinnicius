import { describe, expect, it } from "vitest";
import { isDueToday, isOverdue, reorderAfterMove } from "./calculations";

describe("reorderAfterMove", () => {
  const cards = [
    { id: "a", columnId: "todo", orderIndex: 0 },
    { id: "b", columnId: "todo", orderIndex: 1 },
    { id: "c", columnId: "todo", orderIndex: 2 },
    { id: "d", columnId: "doing", orderIndex: 0 },
  ];

  it("reordena dentro da mesma coluna", () => {
    const result = reorderAfterMove(cards, "a", "todo", 2);
    const todo = result
      .filter((card) => card.columnId === "todo")
      .sort((x, y) => x.orderIndex - y.orderIndex)
      .map((card) => card.id);
    expect(todo).toEqual(["b", "c", "a"]);
  });

  it("move para outra coluna e resequencia origem e destino", () => {
    const result = reorderAfterMove(cards, "b", "doing", 0);

    const todo = result
      .filter((card) => card.columnId === "todo")
      .sort((x, y) => x.orderIndex - y.orderIndex)
      .map((card) => card.id);
    const doing = result
      .filter((card) => card.columnId === "doing")
      .sort((x, y) => x.orderIndex - y.orderIndex)
      .map((card) => card.id);

    expect(todo).toEqual(["a", "c"]);
    expect(doing).toEqual(["b", "d"]);
  });

  it("limita o índice de destino aos limites da coluna", () => {
    const result = reorderAfterMove(cards, "a", "doing", 99);
    const doing = result
      .filter((card) => card.columnId === "doing")
      .sort((x, y) => x.orderIndex - y.orderIndex)
      .map((card) => card.id);
    expect(doing).toEqual(["d", "a"]);
  });

  it("retorna a lista original se o cartão não existe", () => {
    const result = reorderAfterMove(cards, "inexistente", "doing", 0);
    expect(result).toEqual(cards);
  });
});

describe("isOverdue", () => {
  it("é atrasado quando due_date é anterior a hoje e não concluído", () => {
    expect(isOverdue("2026-09-01", null, "2026-09-09")).toBe(true);
  });

  it("não é atrasado no próprio dia do vencimento", () => {
    expect(isOverdue("2026-09-09", null, "2026-09-09")).toBe(false);
  });

  it("não é atrasado se já concluído, mesmo com data no passado", () => {
    expect(isOverdue("2026-09-01", "2026-09-05T12:00:00Z", "2026-09-09")).toBe(false);
  });

  it("não é atrasado sem due_date", () => {
    expect(isOverdue(null, null, "2026-09-09")).toBe(false);
  });
});

describe("isDueToday", () => {
  it("identifica vencimento no dia corrente", () => {
    expect(isDueToday("2026-09-09", "2026-09-09")).toBe(true);
  });

  it("não confunde datas diferentes", () => {
    expect(isDueToday("2026-09-10", "2026-09-09")).toBe(false);
  });
});
