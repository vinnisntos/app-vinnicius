import { toMedicationLogRow, toMedicationRow } from "@/lib/api/mappers-health";
import { getTodayIsoDate } from "@/lib/date";
import { getUserTimezone } from "@/lib/modules/conta/repository";
import {
  MEDICATION_DISCLAIMER,
  type InjectionSite,
  type MedicationFrequency,
  type MedicationOverview,
  type MedicationRoute,
  type MedicationsResponse,
  type SideEffect,
} from "@/types/database";
import * as repository from "./repository";
import { isScheduledOn, nextDueDate, suggestInjectionSite } from "./schedule";

function isoDaysAgo(today: string, days: number) {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Painel de medicação. Responde "é dia de aplicar?", "onde aplicar?" e
 * "como tenho me sentido?" — nunca "quanto aplicar" além do que foi
 * cadastrado pelo usuário a partir da prescrição.
 */
export async function getMedicationsOverview(userId: string): Promise<MedicationsResponse> {
  const today = getTodayIsoDate(await getUserTimezone(userId));
  const [meds, recent] = await Promise.all([
    repository.listMedications(userId),
    repository.logsSince(userId, isoDaysAgo(today, 30)),
  ]);

  const items: MedicationOverview[] = await Promise.all(
    meds.map(async (med) => {
      const last = await repository.lastLogsFor(userId, med.id, 3);
      const lastDate = last[0]?.logDate ?? null;
      const schedule = {
        frequency: med.frequency as MedicationFrequency,
        daysOfWeek: med.daysOfWeek,
        startedOn: med.startedOn,
        isActive: med.isActive,
      };
      return {
        medication: toMedicationRow(med),
        last_log: last[0] ? toMedicationLogRow(last[0]) : null,
        next_due_date: nextDueDate(schedule, today, lastDate),
        due_today: isScheduledOn(schedule, today, lastDate === today ? null : lastDate) && lastDate !== today,
        taken_today: lastDate === today,
        suggested_site: suggestInjectionSite(
          med.route as MedicationRoute,
          last.map((l) => l.injectionSite as InjectionSite | null),
        ),
      };
    }),
  );

  const counts = new Map<SideEffect, number>();
  for (const log of recent) {
    for (const effect of log.sideEffects as SideEffect[]) counts.set(effect, (counts.get(effect) ?? 0) + 1);
  }
  const weekAgo = isoDaysAgo(today, 7);

  return {
    items,
    recent_logs: recent.map(toMedicationLogRow),
    side_effect_summary: [...counts]
      .map(([effect, count]) => ({ effect, count }))
      .sort((a, b) => b.count - a.count),
    severe_recently: recent.some((l) => l.severity === 3 && l.logDate >= weekAgo),
    disclaimer: MEDICATION_DISCLAIMER,
  };
}

/** Medicamentos com aplicação prevista hoje e ainda não registrada. */
export async function dueToday(userId: string, today: string) {
  const meds = await repository.listMedications(userId);
  const due: { id: string; name: string }[] = [];
  for (const med of meds.filter((m) => m.isActive)) {
    const [last] = await repository.lastLogsFor(userId, med.id, 1);
    const lastDate = last?.logDate ?? null;
    if (lastDate === today) continue;
    const schedule = {
      frequency: med.frequency as MedicationFrequency,
      daysOfWeek: med.daysOfWeek,
      startedOn: med.startedOn,
      isActive: med.isActive,
    };
    if (isScheduledOn(schedule, today, lastDate)) due.push({ id: med.id, name: med.name });
  }
  return due;
}
