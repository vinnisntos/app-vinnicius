/**
 * Lembrete recorrente → evento do Google Calendar com RRULE. Um único evento
 * recorrente com alerta "popup" no horário substitui um servidor de push
 * pago: o próprio app do Google Agenda notifica o celular, para sempre, sem
 * cron do nosso lado.
 *
 * Tudo puro (datas como "YYYY-MM-DD", horas "HH:MM" no fuso do lembrete).
 */

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

export function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Data e hora "agora" no fuso informado. */
export function nowInTimezone(timeZone: string, now = new Date()): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/**
 * Primeira ocorrência a partir de agora: hoje se o dia bate e o horário
 * ainda não passou; senão o próximo dia da semana marcado. O DTSTART do
 * evento precisa cair num dia do BYDAY, senão o Google cria uma ocorrência
 * "extra" fora da regra.
 */
export function nextOccurrence(input: {
  today: string;
  nowTime: string;
  daysOfWeek: number[];
  localTime: string;
}): string {
  for (let offset = 0; offset < 8; offset++) {
    const date = addDays(input.today, offset);
    if (!input.daysOfWeek.includes(weekdayOf(date))) continue;
    if (offset === 0 && input.localTime <= input.nowTime) continue;
    return date;
  }
  throw new Error("daysOfWeek vazio");
}

export function buildRrule(daysOfWeek: number[]): string {
  const days = [...new Set(daysOfWeek)].sort((a, b) => a - b).map((d) => BYDAY[d]);
  return `RRULE:FREQ=WEEKLY;BYDAY=${days.join(",")}`;
}

function addMinutes(date: string, time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const dayOffset = Math.floor(total / 1440);
  const rest = total % 1440;
  const hh = String(Math.floor(rest / 60)).padStart(2, "0");
  const mm = String(rest % 60).padStart(2, "0");
  return { date: addDays(date, dayOffset), time: `${hh}:${mm}` };
}

export interface GoogleEventPayload {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  recurrence: string[];
  reminders: { useDefault: false; overrides: { method: "popup"; minutes: number }[] };
}

export function buildEventPayload(input: {
  title: string;
  appUrl: string;
  path: string;
  startDate: string;
  localTime: string; // "HH:MM"
  durationMinutes: number;
  timezone: string;
  daysOfWeek: number[];
}): GoogleEventPayload {
  const end = addMinutes(input.startDate, input.localTime, input.durationMinutes);
  return {
    summary: input.title,
    description: `Abra o app para registrar: ${input.appUrl}${input.path}`,
    // dateTime sem offset + timeZone: o Google aplica o fuso (inclusive
    // eventual horário de verão) em cada ocorrência.
    start: { dateTime: `${input.startDate}T${input.localTime}:00`, timeZone: input.timezone },
    end: { dateTime: `${end.date}T${end.time}:00`, timeZone: input.timezone },
    recurrence: [buildRrule(input.daysOfWeek)],
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 0 }] },
  };
}
