import { z } from "zod";
import { REMINDER_KINDS, type ReminderKind } from "@/types/database";

export const reminderKindSchema = z.enum(REMINDER_KINDS);

/** Espelha `CalendarReminderUpsert` de src/types/database.ts. */
export const reminderUpsertSchema = z
  .object({
    title: z.string().trim().min(1, "Informe um título.").max(120),
    days_of_week: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Escolha ao menos um dia.")
      .max(7)
      .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
    local_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido (HH:MM)."),
    duration_minutes: z.number().int().min(5).max(240).default(30),
    is_active: z.boolean().default(true),
  })
  .strict();
export type ReminderUpsertInput = z.infer<typeof reminderUpsertSchema>;

/** Tela do app que o link do evento abre. */
export const REMINDER_PATHS: Record<ReminderKind, string> = {
  treino: "/treinos",
  refeicoes: "/alimentacao",
  agua: "/alimentacao",
  pesagem: "/alimentacao",
  medicacao: "/saude",
};
