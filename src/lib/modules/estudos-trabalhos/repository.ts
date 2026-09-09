import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kanbanCards, kanbanColumns } from "@/lib/db/schema";
import { reorderAfterMove, type CardCategory, type CardPriority } from "./calculations";
import type {
  CreateCardInput,
  CreateColumnInput,
  MoveCardInput,
  RenameColumnInput,
  UpdateCardInput,
} from "./schema";

export type BoardCard = {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  category: CardCategory;
  priority: CardPriority;
  dueDate: string | null;
  orderIndex: number;
  completedAt: string | null;
};

export type BoardColumn = {
  id: string;
  name: string;
  orderIndex: number;
  cards: BoardCard[];
};

function toBoardCard(row: typeof kanbanCards.$inferSelect): BoardCard {
  return {
    id: row.id,
    columnId: row.columnId,
    title: row.title,
    description: row.description,
    category: row.category as CardCategory,
    priority: row.priority as CardPriority,
    dueDate: row.dueDate,
    orderIndex: row.orderIndex,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

export async function getBoard(userId: string): Promise<BoardColumn[]> {
  const [columns, cards] = await Promise.all([
    db
      .select()
      .from(kanbanColumns)
      .where(eq(kanbanColumns.userId, userId))
      .orderBy(asc(kanbanColumns.orderIndex)),
    db
      .select()
      .from(kanbanCards)
      .where(eq(kanbanCards.userId, userId))
      .orderBy(asc(kanbanCards.orderIndex)),
  ]);

  return columns.map((column) => ({
    id: column.id,
    name: column.name,
    orderIndex: column.orderIndex,
    cards: cards.filter((card) => card.columnId === column.id).map(toBoardCard),
  }));
}

export async function getOverdueAndTodayCards(userId: string, todayIso: string) {
  const rows = await db
    .select()
    .from(kanbanCards)
    .where(
      and(
        eq(kanbanCards.userId, userId),
        isNull(kanbanCards.completedAt),
        lte(kanbanCards.dueDate, todayIso),
      ),
    )
    .orderBy(asc(kanbanCards.dueDate));

  return rows.map(toBoardCard);
}

export async function createCard(userId: string, input: CreateCardInput) {
  const [{ maxOrder }] = await db
    .select({
      maxOrder: sql<number>`coalesce(max(${kanbanCards.orderIndex}), -1)`.mapWith(Number),
    })
    .from(kanbanCards)
    .where(and(eq(kanbanCards.userId, userId), eq(kanbanCards.columnId, input.columnId)));

  const [created] = await db
    .insert(kanbanCards)
    .values({
      userId,
      columnId: input.columnId,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      priority: input.priority,
      dueDate: input.dueDate ?? null,
      orderIndex: maxOrder + 1,
    })
    .returning();
  return created;
}

export async function updateCard(userId: string, input: UpdateCardInput) {
  const [updated] = await db
    .update(kanbanCards)
    .set({
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      priority: input.priority,
      dueDate: input.dueDate ?? null,
    })
    .where(and(eq(kanbanCards.id, input.id), eq(kanbanCards.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function toggleCardCompletion(
  userId: string,
  id: string,
  completed: boolean,
) {
  const [updated] = await db
    .update(kanbanCards)
    .set({ completedAt: completed ? new Date() : null })
    .where(and(eq(kanbanCards.id, id), eq(kanbanCards.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteCard(userId: string, id: string) {
  await db
    .delete(kanbanCards)
    .where(and(eq(kanbanCards.id, id), eq(kanbanCards.userId, userId)));
}

export async function moveCard(userId: string, input: MoveCardInput) {
  await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: kanbanCards.id,
        columnId: kanbanCards.columnId,
        orderIndex: kanbanCards.orderIndex,
      })
      .from(kanbanCards)
      .where(eq(kanbanCards.userId, userId));

    const updated = reorderAfterMove(rows, input.cardId, input.toColumnId, input.toIndex);

    for (const card of updated) {
      const original = rows.find((row) => row.id === card.id);
      if (!original) continue;
      if (original.columnId === card.columnId && original.orderIndex === card.orderIndex) {
        continue;
      }
      await tx
        .update(kanbanCards)
        .set({ columnId: card.columnId, orderIndex: card.orderIndex })
        .where(and(eq(kanbanCards.id, card.id), eq(kanbanCards.userId, userId)));
    }
  });
}

export async function createColumn(userId: string, input: CreateColumnInput) {
  const [{ maxOrder }] = await db
    .select({
      maxOrder: sql<number>`coalesce(max(${kanbanColumns.orderIndex}), -1)`.mapWith(Number),
    })
    .from(kanbanColumns)
    .where(eq(kanbanColumns.userId, userId));

  const [created] = await db
    .insert(kanbanColumns)
    .values({ userId, name: input.name, orderIndex: maxOrder + 1 })
    .returning();
  return created;
}

export async function renameColumn(userId: string, input: RenameColumnInput) {
  const [updated] = await db
    .update(kanbanColumns)
    .set({ name: input.name })
    .where(and(eq(kanbanColumns.id, input.id), eq(kanbanColumns.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function reorderColumns(userId: string, orderedIds: string[]) {
  await db.transaction(async (tx) => {
    for (let index = 0; index < orderedIds.length; index++) {
      await tx
        .update(kanbanColumns)
        .set({ orderIndex: index })
        .where(and(eq(kanbanColumns.id, orderedIds[index]), eq(kanbanColumns.userId, userId)));
    }
  });
}
