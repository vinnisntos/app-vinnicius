import { ApiClientError, apiData } from "@/lib/api/client";
import type { MealItemAdd, MealLogItemRow, MealLogRow } from "@/types/database";

export type PendingMealItem =
  | { op: "add"; id: string; payload: MealItemAdd; item: MealLogItemRow }
  | { op: "delete"; id: string; log_date: string; meal_slot: string };

export const mealItemQueueKey = (userId: string) => `lifeos.nutrition.mealItemQueue:${userId}`;

export function readMealItemQueue(userId: string): PendingMealItem[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(mealItemQueueKey(userId)) ?? "[]");
    return Array.isArray(value) ? value.filter((entry): entry is PendingMealItem =>
      !!entry && typeof entry === "object" && (entry.op === "add" || entry.op === "delete") && typeof entry.id === "string") : [];
  } catch { return []; }
}

function write(userId: string, entries: PendingMealItem[]) {
  localStorage.setItem(mealItemQueueKey(userId), JSON.stringify(entries));
}

export function enqueueMealItem(userId: string, entry: PendingMealItem) {
  const queue = readMealItemQueue(userId);
  // A mesma operação pode ser reexecutada após uma falha ambígua de rede.
  if (!queue.some((current) => current.op === entry.op && current.id === entry.id)) {
    write(userId, [...queue, entry]);
  }
}

export function overlayMealItems(items: MealLogItemRow[], queue: PendingMealItem[], date: string, slot: string) {
  const result = new Map(items.map((item) => [item.id, item]));
  for (const entry of queue) {
    if (entry.op === "add" && entry.payload.log_date === date && entry.payload.meal_slot === slot) result.set(entry.id, entry.item);
    if (entry.op === "delete" && entry.log_date === date && entry.meal_slot === slot) result.delete(entry.id);
  }
  return [...result.values()];
}

export const isMealItemNetworkFailure = (cause: unknown) => !(cause instanceof ApiClientError);

type Response = { meal: MealLogRow; items: MealLogItemRow[] };
let flushing = false;
export async function flushMealItemQueue(userId: string): Promise<{ synced: number; discarded: number }> {
  if (flushing) return { synced: 0, discarded: 0 };
  flushing = true;
  let synced = 0; let discarded = 0;
  try {
    while (true) {
      const entry = readMealItemQueue(userId)[0];
      if (!entry) break;
      try {
        if (entry.op === "add") await apiData<Response>("/api/nutrition/meal-items", { method: "POST", json: entry.payload });
        else await apiData<Response>(`/api/nutrition/meal-items/${entry.id}`, { method: "DELETE" });
        synced++;
      } catch (cause) {
        if (!(cause instanceof ApiClientError) || cause.status < 400 || cause.status >= 500) break;
        // DELETE 404 significa que o item já havia sido removido antes da resposta se perder.
        if (entry.op === "delete" && cause.status === 404) synced++;
        else discarded++;
      }
      const queue = readMealItemQueue(userId);
      const index = queue.findIndex((current) => current.op === entry.op && current.id === entry.id);
      if (index >= 0) { queue.splice(index, 1); write(userId, queue); }
    }
    return { synced, discarded };
  } finally { flushing = false; }
}
