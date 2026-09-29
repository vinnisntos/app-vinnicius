import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { calendarReminders, googleCalendarConnections } from "@/lib/db/schema";
import type { ReminderKind } from "@/types/database";
import type { ReminderUpsertInput } from "./schema";

export async function getConnection(userId: string) {
  const [row] = await db
    .select()
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function saveConnection(
  userId: string,
  input: { refreshTokenEncrypted: string; scope: string; googleEmail: string | null },
) {
  await db
    .insert(googleCalendarConnections)
    .values({ userId, ...input })
    .onConflictDoUpdate({
      target: googleCalendarConnections.userId,
      set: { ...input, connectedAt: new Date() },
    });
}

export async function deleteConnection(userId: string) {
  await db.delete(googleCalendarConnections).where(eq(googleCalendarConnections.userId, userId));
}

export async function listReminders(userId: string) {
  return db
    .select()
    .from(calendarReminders)
    .where(eq(calendarReminders.userId, userId))
    .orderBy(asc(calendarReminders.kind));
}

export async function getReminder(userId: string, kind: ReminderKind) {
  const [row] = await db
    .select()
    .from(calendarReminders)
    .where(and(eq(calendarReminders.userId, userId), eq(calendarReminders.kind, kind)))
    .limit(1);
  return row ?? null;
}

export async function upsertReminder(
  userId: string,
  kind: ReminderKind,
  input: ReminderUpsertInput,
  timezone: string,
) {
  const values = {
    title: input.title,
    daysOfWeek: input.days_of_week,
    localTime: `${input.local_time}:00`,
    durationMinutes: input.duration_minutes,
    isActive: input.is_active,
    timezone,
  };
  const [row] = await db
    .insert(calendarReminders)
    .values({ userId, kind, ...values })
    .onConflictDoUpdate({ target: [calendarReminders.userId, calendarReminders.kind], set: values })
    .returning();
  return row;
}

export async function setSyncResult(
  id: string,
  result: { googleEventId: string | null; error: string | null },
) {
  const [row] = await db
    .update(calendarReminders)
    .set({
      googleEventId: result.googleEventId,
      lastSyncError: result.error,
      ...(result.error ? {} : { syncedAt: new Date() }),
    })
    .where(eq(calendarReminders.id, id))
    .returning();
  return row;
}

/** Desconectou o Google: lembretes continuam salvos, só perdem o vínculo. */
export async function unlinkAllEvents(userId: string) {
  await db
    .update(calendarReminders)
    .set({ googleEventId: null, syncedAt: null, lastSyncError: null })
    .where(eq(calendarReminders.userId, userId));
}

export async function deleteReminder(userId: string, kind: ReminderKind) {
  const rows = await db
    .delete(calendarReminders)
    .where(and(eq(calendarReminders.userId, userId), eq(calendarReminders.kind, kind)))
    .returning({ id: calendarReminders.id });
  return rows.length > 0;
}
