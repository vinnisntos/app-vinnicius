import { ApiHttpError } from "@/lib/api/handler";
import { toCalendarReminderRow } from "@/lib/api/mappers";
import type { CalendarReminder } from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/integrations/crypto";
import { deleteEvent, GoogleCalendarError, upsertEvent } from "@/lib/integrations/google/calendar";
import {
  exchangeCode,
  forgetAccessToken,
  getAccessToken,
  GoogleAuthError,
  isGoogleConfigured,
  revokeToken,
} from "@/lib/integrations/google/oauth";
import { buildEventPayload, nextOccurrence, nowInTimezone } from "@/lib/integrations/google/recurrence";
import { getUserTimezone } from "@/lib/modules/conta/repository";
import type { CalendarReminderRow, GoogleCalendarStatus, ReminderKind } from "@/types/database";
import * as repository from "./repository";
import { REMINDER_PATHS, type ReminderUpsertInput } from "./schema";

export async function getGoogleStatus(userId: string): Promise<GoogleCalendarStatus> {
  const connection = await repository.getConnection(userId);
  return {
    available: isGoogleConfigured(),
    connected: Boolean(connection),
    google_email: connection?.googleEmail ?? null,
    connected_at: connection?.connectedAt.toISOString() ?? null,
  };
}

export async function connectGoogle(userId: string, input: { code: string; verifier: string; origin: string }) {
  const tokens = await exchangeCode(input);
  await repository.saveConnection(userId, {
    refreshTokenEncrypted: encryptSecret(tokens.refreshToken),
    scope: tokens.scope,
    googleEmail: tokens.email,
  });
  forgetAccessToken(userId);
  // Lembretes criados antes da conexão sobem agora.
  await syncAll(userId, input.origin);
}

/** Token revogado no Google → limpa a conexão e pede reconexão. */
async function handleInvalidGrant(userId: string): Promise<never> {
  await repository.deleteConnection(userId);
  await repository.unlinkAllEvents(userId);
  forgetAccessToken(userId);
  throw new ApiHttpError(409, "conflict", "Sua conexão com o Google expirou. Conecte novamente.");
}

async function withCalendar<T>(
  userId: string,
  fn: (accessToken: string, calendarId: string) => Promise<T>,
): Promise<T | null> {
  const connection = await repository.getConnection(userId);
  if (!connection || !isGoogleConfigured()) return null;
  try {
    const accessToken = await getAccessToken(userId, decryptSecret(connection.refreshTokenEncrypted));
    return await fn(accessToken, connection.calendarId);
  } catch (error) {
    if (error instanceof GoogleAuthError && error.isInvalidGrant) return handleInvalidGrant(userId);
    if (error instanceof GoogleCalendarError && error.status === 401) {
      forgetAccessToken(userId);
    }
    throw error;
  }
}

/**
 * Cria/atualiza/remove o evento recorrente do lembrete. Falha do Google é
 * gravada em `last_sync_error` (a UI mostra "não sincronizado") e vira 502 —
 * o lembrete em si continua salvo.
 */
async function syncReminder(userId: string, reminder: CalendarReminder, appUrl: string) {
  try {
    const result = await withCalendar(userId, async (token, calendarId) => {
      if (!reminder.isActive) {
        if (reminder.googleEventId) await deleteEvent(token, calendarId, reminder.googleEventId);
        return null;
      }
      const localTime = reminder.localTime.slice(0, 5);
      const now = nowInTimezone(reminder.timezone);
      const event = buildEventPayload({
        title: reminder.title,
        appUrl,
        path: REMINDER_PATHS[reminder.kind as ReminderKind],
        startDate: nextOccurrence({
          today: now.date,
          nowTime: now.time,
          daysOfWeek: reminder.daysOfWeek,
          localTime,
        }),
        localTime,
        durationMinutes: reminder.durationMinutes,
        timezone: reminder.timezone,
        daysOfWeek: reminder.daysOfWeek,
      });
      return upsertEvent(token, calendarId, reminder.googleEventId, event);
    });

    // null do withCalendar = sem conexão: nada a sincronizar.
    const connected = (await repository.getConnection(userId)) !== null;
    if (!connected) return reminder;
    return repository.setSyncResult(reminder.id, { googleEventId: result, error: null });
  } catch (error) {
    if (error instanceof ApiHttpError) throw error;
    const message = error instanceof Error ? error.message : "Falha ao sincronizar";
    console.error("[google] sync", reminder.kind, message);
    await repository.setSyncResult(reminder.id, { googleEventId: reminder.googleEventId, error: message });
    throw new ApiHttpError(502, "upstream", "Lembrete salvo, mas o Google Agenda não respondeu. Tente de novo.");
  }
}

async function syncAll(userId: string, appUrl: string) {
  for (const reminder of await repository.listReminders(userId)) {
    await syncReminder(userId, reminder, appUrl).catch(() => undefined);
  }
}

export async function listReminders(userId: string): Promise<{
  reminders: CalendarReminderRow[];
  google: GoogleCalendarStatus;
}> {
  const [reminders, google] = await Promise.all([
    repository.listReminders(userId),
    getGoogleStatus(userId),
  ]);
  return { reminders: reminders.map(toCalendarReminderRow), google };
}

export async function saveReminder(
  userId: string,
  kind: ReminderKind,
  input: ReminderUpsertInput,
  appUrl: string,
): Promise<CalendarReminderRow> {
  const timezone = await getUserTimezone(userId);
  const saved = await repository.upsertReminder(userId, kind, input, timezone);
  return toCalendarReminderRow(await syncReminder(userId, saved, appUrl));
}

export async function removeReminder(userId: string, kind: ReminderKind): Promise<boolean> {
  const reminder = await repository.getReminder(userId, kind);
  if (!reminder) return false;
  if (reminder.googleEventId) {
    const eventId = reminder.googleEventId;
    await withCalendar(userId, (token, calendarId) => deleteEvent(token, calendarId, eventId)).catch(
      (error) => {
        // Evento órfão no Google é aceitável; lembrete local sai do mesmo jeito.
        if (error instanceof ApiHttpError) return;
        console.error("[google] delete", kind, error);
      },
    );
  }
  return repository.deleteReminder(userId, kind);
}

/** Remove eventos, revoga o token no Google e apaga a conexão. */
export async function disconnectGoogle(userId: string) {
  const connection = await repository.getConnection(userId);
  if (!connection) return;

  const reminders = await repository.listReminders(userId);
  await withCalendar(userId, async (token, calendarId) => {
    for (const r of reminders) {
      if (r.googleEventId) await deleteEvent(token, calendarId, r.googleEventId).catch(() => undefined);
    }
  }).catch(() => undefined);

  await revokeToken(decryptSecret(connection.refreshTokenEncrypted));
  await repository.deleteConnection(userId);
  await repository.unlinkAllEvents(userId);
  forgetAccessToken(userId);
}
