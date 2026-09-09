import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { financeCategories, financeTransactions } from "@/lib/db/schema";
import { getMonthDateRange, type TransactionType } from "./calculations";
import type {
  CreateCategoryInput,
  CreateTransactionInput,
  UpdateTransactionInput,
} from "./schema";

export async function getCategories(userId: string) {
  return db
    .select()
    .from(financeCategories)
    .where(eq(financeCategories.userId, userId))
    .orderBy(financeCategories.kind, financeCategories.name);
}

export type TransactionWithCategory = {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  occurredOn: string;
  isRecurring: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
};

export async function getTransactionsForMonth(
  userId: string,
  yearMonth: string,
): Promise<TransactionWithCategory[]> {
  const { start, end } = getMonthDateRange(yearMonth);

  const rows = await db
    .select({
      id: financeTransactions.id,
      type: financeTransactions.type,
      description: financeTransactions.description,
      amount: financeTransactions.amount,
      occurredOn: financeTransactions.occurredOn,
      isRecurring: financeTransactions.isRecurring,
      categoryId: financeTransactions.categoryId,
      categoryName: financeCategories.name,
      categoryColor: financeCategories.color,
    })
    .from(financeTransactions)
    .leftJoin(
      financeCategories,
      eq(financeCategories.id, financeTransactions.categoryId),
    )
    .where(
      and(
        eq(financeTransactions.userId, userId),
        gte(financeTransactions.occurredOn, start),
        lte(financeTransactions.occurredOn, end),
      ),
    )
    .orderBy(desc(financeTransactions.occurredOn), desc(financeTransactions.createdAt));

  return rows.map((row) => ({
    ...row,
    type: row.type as TransactionType,
    amount: Number(row.amount),
  }));
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
) {
  const [created] = await db
    .insert(financeTransactions)
    .values({
      userId,
      type: input.type,
      description: input.description,
      amount: input.amount.toString(),
      occurredOn: input.occurredOn,
      categoryId: input.categoryId ?? null,
      isRecurring: input.isRecurring ?? false,
    })
    .returning();
  return created;
}

export async function updateTransaction(
  userId: string,
  input: UpdateTransactionInput,
) {
  const [updated] = await db
    .update(financeTransactions)
    .set({
      type: input.type,
      description: input.description,
      amount: input.amount.toString(),
      occurredOn: input.occurredOn,
      categoryId: input.categoryId ?? null,
      isRecurring: input.isRecurring ?? false,
    })
    .where(
      and(eq(financeTransactions.id, input.id), eq(financeTransactions.userId, userId)),
    )
    .returning();
  return updated ?? null;
}

export async function deleteTransaction(userId: string, id: string) {
  await db
    .delete(financeTransactions)
    .where(and(eq(financeTransactions.id, id), eq(financeTransactions.userId, userId)));
}

export async function createCategory(userId: string, input: CreateCategoryInput) {
  const [created] = await db
    .insert(financeCategories)
    .values({
      userId,
      name: input.name,
      kind: input.kind,
      color: input.color,
    })
    .returning();
  return created;
}
