"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { getTodayIsoDate } from "@/lib/date";
import { getPreviousYearMonth, getYearMonth } from "./calculations";
import * as repository from "./repository";
import {
  createCategorySchema,
  createTransactionSchema,
  deleteTransactionSchema,
  updateTransactionSchema,
  type CreateCategoryInput,
  type CreateTransactionInput,
  type DeleteTransactionInput,
  type UpdateTransactionInput,
} from "./schema";

export type ActionResult = { error?: string };

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<ActionResult> {
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.createTransaction(userId, parsed.data);
  revalidatePath("/financeiro");
  revalidatePath("/");
  return {};
}

export async function updateTransaction(
  input: UpdateTransactionInput,
): Promise<ActionResult> {
  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  const result = await repository.updateTransaction(userId, parsed.data);
  if (!result) return { error: "Transação não encontrada." };
  revalidatePath("/financeiro");
  return {};
}

export async function deleteTransaction(
  input: DeleteTransactionInput,
): Promise<ActionResult> {
  const parsed = deleteTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.deleteTransaction(userId, parsed.data.id);
  revalidatePath("/financeiro");
  return {};
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<ActionResult> {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.createCategory(userId, parsed.data);
  revalidatePath("/financeiro");
  return {};
}

export type RepeatRecurringResult = ActionResult & { count?: number };

/**
 * Clona as transações recorrentes do mês anterior para o mês corrente —
 * só permitido quando o mês corrente ainda não tem nenhum lançamento, para
 * não precisar de lógica de deduplicação (ver docs/04-api-contratos.md).
 */
export async function repeatRecurringTransactions(): Promise<RepeatRecurringResult> {
  const userId = await requireUserId();
  const yearMonth = getYearMonth(getTodayIsoDate());

  const currentMonthTransactions = await repository.getTransactionsForMonth(
    userId,
    yearMonth,
  );
  if (currentMonthTransactions.length > 0) {
    return { error: "Este mês já tem transações lançadas." };
  }

  const previousYearMonth = getPreviousYearMonth(yearMonth);
  const previousMonthTransactions = await repository.getTransactionsForMonth(
    userId,
    previousYearMonth,
  );
  const recurring = previousMonthTransactions.filter((t) => t.isRecurring);
  if (recurring.length === 0) {
    return { error: "Nenhuma transação recorrente no mês passado." };
  }

  await repository.cloneTransactionsToMonth(userId, recurring, yearMonth);
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { count: recurring.length };
}
