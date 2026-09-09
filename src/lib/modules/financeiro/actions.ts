"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
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
