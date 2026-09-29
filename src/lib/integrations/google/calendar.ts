import type { GoogleEventPayload } from "./recurrence";

/** Chamadas mínimas à Calendar API v3 (fetch puro, sem SDK). */

const BASE = "https://www.googleapis.com/calendar/v3/calendars";

export class GoogleCalendarError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(accessToken: string, method: string, url: string, body?: unknown): Promise<T | null> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body !== undefined && { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 204) return null;
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new GoogleCalendarError(response.status, json?.error?.message ?? `HTTP ${response.status}`);
  }
  return json as T;
}

const eventsUrl = (calendarId: string) => `${BASE}/${encodeURIComponent(calendarId)}/events`;

export async function insertEvent(accessToken: string, calendarId: string, event: GoogleEventPayload) {
  const created = await call<{ id: string }>(accessToken, "POST", eventsUrl(calendarId), event);
  return created!.id;
}

/**
 * Atualiza o evento recorrente inteiro (PUT substitui a série). Se o
 * usuário apagou o evento no Google (404/410), recria.
 */
export async function upsertEvent(
  accessToken: string,
  calendarId: string,
  eventId: string | null,
  event: GoogleEventPayload,
): Promise<string> {
  if (eventId) {
    try {
      await call(accessToken, "PUT", `${eventsUrl(calendarId)}/${encodeURIComponent(eventId)}`, event);
      return eventId;
    } catch (error) {
      if (!(error instanceof GoogleCalendarError) || ![404, 410].includes(error.status)) throw error;
    }
  }
  return insertEvent(accessToken, calendarId, event);
}

/** Idempotente: evento já apagado (404/410) conta como sucesso. */
export async function deleteEvent(accessToken: string, calendarId: string, eventId: string) {
  try {
    await call(accessToken, "DELETE", `${eventsUrl(calendarId)}/${encodeURIComponent(eventId)}`);
  } catch (error) {
    if (!(error instanceof GoogleCalendarError) || ![404, 410].includes(error.status)) throw error;
  }
}
