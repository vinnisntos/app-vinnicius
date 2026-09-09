"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import * as repository from "./repository";
import {
  logWaterSchema,
  logWeightSchema,
  toggleMealSchema,
  updateNutritionProfileSchema,
  type LogWaterInput,
  type LogWeightInput,
  type ToggleMealInput,
  type UpdateNutritionProfileInput,
} from "./schema";

export type ActionResult = { error?: string };

export async function updateNutritionProfile(
  input: UpdateNutritionProfileInput,
): Promise<ActionResult> {
  const parsed = updateNutritionProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.upsertNutritionProfile(userId, parsed.data);
  revalidatePath("/alimentacao");
  return {};
}

export async function logWeight(input: LogWeightInput): Promise<ActionResult> {
  const parsed = logWeightSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.logWeight(userId, parsed.data);
  revalidatePath("/alimentacao");
  return {};
}

export async function toggleMeal(input: ToggleMealInput): Promise<ActionResult> {
  const parsed = toggleMealSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.toggleMeal(userId, parsed.data);
  revalidatePath("/alimentacao");
  revalidatePath("/");
  return {};
}

export async function logWater(input: LogWaterInput): Promise<ActionResult> {
  const parsed = logWaterSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const userId = await requireUserId();
  await repository.logWater(userId, parsed.data);
  revalidatePath("/alimentacao");
  revalidatePath("/");
  return {};
}
