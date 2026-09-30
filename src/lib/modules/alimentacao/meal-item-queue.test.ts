import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiData } from "@/lib/api/client";
import type { MealItemAdd, MealLogItemRow } from "@/types/database";
import { enqueueMealItem, flushMealItemQueue, mealItemQueueKey, overlayMealItems, readMealItemQueue } from "./meal-item-queue";

vi.mock("@/lib/api/client", () => ({
  ApiClientError: class extends Error { constructor(public status: number, public code: string, message: string) { super(message); } },
  apiData: vi.fn(),
}));

const id = "00000000-0000-4000-8000-000000000001";
const payload: MealItemAdd = { id, log_date: "2026-09-29", meal_slot: "almoco", servings: 1, custom: { name: "Almoço", kcal: 300 } };
const item = { id, meal_log_id: id, food_id: null, name: "Almoço", servings: 1, kcal: 300, protein_g: 0, carbs_g: 0, fat_g: 0, created_at: "2026-09-29T12:00:00Z" } as MealLogItemRow;

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } });
  vi.mocked(apiData).mockReset();
});

describe("fila offline de itens", () => {
  it("isola usuários e não duplica a mesma operação", () => {
    enqueueMealItem("alice", { op: "add", id, payload, item });
    enqueueMealItem("alice", { op: "add", id, payload, item });
    expect(readMealItemQueue("alice")).toHaveLength(1);
    expect(readMealItemQueue("bob")).toHaveLength(0);
    expect(mealItemQueueKey("alice")).toContain(":alice");
  });

  it("sobrepõe adição pendente e depois remoção pendente", () => {
    const add = { op: "add" as const, id, payload, item };
    const del = { op: "delete" as const, id, log_date: payload.log_date, meal_slot: payload.meal_slot };
    expect(overlayMealItems([], [add], payload.log_date, payload.meal_slot)).toEqual([item]);
    expect(overlayMealItems([], [add, del], payload.log_date, payload.meal_slot)).toEqual([]);
    expect(overlayMealItems([], [add], "2026-09-28", payload.meal_slot)).toEqual([]);
  });

  it("reenvia com o mesmo id e preserva em falha de rede", async () => {
    enqueueMealItem("alice", { op: "add", id, payload, item });
    vi.mocked(apiData).mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce({} as never);
    expect(await flushMealItemQueue("alice")).toEqual({ synced: 0, discarded: 0 });
    expect(readMealItemQueue("alice")).toHaveLength(1);
    expect(await flushMealItemQueue("alice")).toEqual({ synced: 1, discarded: 0 });
    expect(vi.mocked(apiData).mock.calls[1][1]).toMatchObject({ json: payload });
    expect(readMealItemQueue("alice")).toHaveLength(0);
  });

  it("descarta 4xx e trata DELETE 404 como remoção concluída", async () => {
    enqueueMealItem("alice", { op: "add", id, payload, item });
    enqueueMealItem("alice", { op: "delete", id, log_date: payload.log_date, meal_slot: payload.meal_slot });
    vi.mocked(apiData).mockRejectedValueOnce(new ApiClientError(422, "validation", "inválido")).mockRejectedValueOnce(new ApiClientError(404, "not_found", "ausente"));
    expect(await flushMealItemQueue("alice")).toEqual({ synced: 1, discarded: 1 });
    expect(readMealItemQueue("alice")).toHaveLength(0);
  });
});
