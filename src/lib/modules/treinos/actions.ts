"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import * as repository from "./repository";
import {
  createPlanSchema,
  deleteExerciseSchema,
  finishSessionSchema,
  logSetSchema,
  startSessionSchema,
  upsertExerciseSchema,
  type CreatePlanInput,
  type DeleteExerciseInput,
  type FinishSessionInput,
  type LogSetInput,
  type StartSessionInput,
  type UpsertExerciseInput,
} from "./schema";

export type ActionResult = { error?: string };

export async function createPlan(input: CreatePlanInput): Promise<ActionResult> {
  const parsed = createPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.createPlan(userId, parsed.data);
  revalidatePath("/treinos");
  return {};
}

export async function upsertExercise(
  input: UpsertExerciseInput,
): Promise<ActionResult> {
  const parsed = upsertExerciseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  const result = await repository.upsertExercise(userId, parsed.data);
  if (!result) return { error: "Plano não encontrado." };
  revalidatePath("/treinos");
  return {};
}

export async function deleteExercise(
  input: DeleteExerciseInput,
): Promise<ActionResult> {
  const parsed = deleteExerciseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.deleteExercise(userId, parsed.data.id);
  revalidatePath("/treinos");
  return {};
}

export async function startSession(
  input: StartSessionInput,
): Promise<ActionResult> {
  const parsed = startSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.startSession(userId, parsed.data);
  revalidatePath("/treinos");
  return {};
}

export async function logSet(input: LogSetInput): Promise<ActionResult> {
  const parsed = logSetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  const result = await repository.logSet(userId, parsed.data);
  if (!result) return { error: "Sessão não encontrada." };
  revalidatePath("/treinos");
  return {};
}

export async function finishSession(
  input: FinishSessionInput,
): Promise<ActionResult> {
  const parsed = finishSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.finishSession(userId, parsed.data);
  revalidatePath("/treinos");
  return {};
}
