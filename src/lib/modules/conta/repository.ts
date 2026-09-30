import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appSettings, faqItems, profiles, subscriptions } from "@/lib/db/schema";
import type { UpdateProfileInput } from "./schema";

export async function getProfile(userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return profile ?? null;
}

export async function getSubscription(userId: string) {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return sub ?? null;
}

/** role/email ficam fora de propósito — só master/trigger do Auth alteram. */
export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const [updated] = await db
    .update(profiles)
    .set({
      ...(input.full_name !== undefined && { fullName: input.full_name }),
      ...(input.avatar_url !== undefined && { avatarUrl: input.avatar_url }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.sound_enabled !== undefined && { soundEnabled: input.sound_enabled }),
      ...(input.haptics_enabled !== undefined && { hapticsEnabled: input.haptics_enabled }),
      ...(input.onboarding_completed && { onboardingCompletedAt: new Date() }),
    })
    .where(eq(profiles.id, userId))
    .returning();
  return updated;
}

export async function getUserTimezone(userId: string): Promise<string> {
  const [row] = await db
    .select({ timezone: profiles.timezone })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row?.timezone ?? "America/Sao_Paulo";
}

export async function getAppSettings() {
  const [settings] = await db.select().from(appSettings).limit(1);
  return settings;
}

export async function getPublishedFaq() {
  return db
    .select()
    .from(faqItems)
    .where(eq(faqItems.isPublished, true))
    .orderBy(asc(faqItems.category), asc(faqItems.orderIndex), asc(faqItems.createdAt));
}
