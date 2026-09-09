"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import * as repository from "./repository";
import {
  createCardSchema,
  createColumnSchema,
  deleteCardSchema,
  moveCardSchema,
  renameColumnSchema,
  reorderColumnsSchema,
  toggleCardCompletionSchema,
  updateCardSchema,
  type CreateCardInput,
  type CreateColumnInput,
  type DeleteCardInput,
  type MoveCardInput,
  type RenameColumnInput,
  type ReorderColumnsInput,
  type ToggleCardCompletionInput,
  type UpdateCardInput,
} from "./schema";

export type ActionResult = { error?: string };

const BOARD_PATH = "/estudos-trabalhos";

export async function createCard(input: CreateCardInput): Promise<ActionResult> {
  const parsed = createCardSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.createCard(userId, parsed.data);
  revalidatePath(BOARD_PATH);
  return {};
}

export async function updateCard(input: UpdateCardInput): Promise<ActionResult> {
  const parsed = updateCardSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  const result = await repository.updateCard(userId, parsed.data);
  if (!result) return { error: "Cartão não encontrado." };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function deleteCard(input: DeleteCardInput): Promise<ActionResult> {
  const parsed = deleteCardSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.deleteCard(userId, parsed.data.id);
  revalidatePath(BOARD_PATH);
  return {};
}

export async function toggleCardCompletion(
  input: ToggleCardCompletionInput,
): Promise<ActionResult> {
  const parsed = toggleCardCompletionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.toggleCardCompletion(userId, parsed.data.id, parsed.data.completed);
  revalidatePath(BOARD_PATH);
  return {};
}

export async function moveCard(input: MoveCardInput): Promise<ActionResult> {
  const parsed = moveCardSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.moveCard(userId, parsed.data);
  revalidatePath(BOARD_PATH);
  return {};
}

export async function createColumn(input: CreateColumnInput): Promise<ActionResult> {
  const parsed = createColumnSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.createColumn(userId, parsed.data);
  revalidatePath(BOARD_PATH);
  return {};
}

export async function renameColumn(input: RenameColumnInput): Promise<ActionResult> {
  const parsed = renameColumnSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  const result = await repository.renameColumn(userId, parsed.data);
  if (!result) return { error: "Coluna não encontrada." };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function reorderColumns(input: ReorderColumnsInput): Promise<ActionResult> {
  const parsed = reorderColumnsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.reorderColumns(userId, parsed.data.orderedIds);
  revalidatePath(BOARD_PATH);
  return {};
}
