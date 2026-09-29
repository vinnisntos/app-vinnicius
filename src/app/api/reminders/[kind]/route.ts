import { apiRoute, notFound } from "@/lib/api/handler";
import { reminderKindSchema, reminderUpsertSchema } from "@/lib/modules/lembretes/schema";
import { removeReminder, saveReminder } from "@/lib/modules/lembretes/service";

const appUrl = (origin: string) => (process.env.APP_URL || origin).replace(/\/$/, "");

/**
 * PUT /api/reminders/:kind (treino|refeicoes|agua|pesagem) — cria/atualiza
 * e sincroniza com o Google se conectado. 502 = salvo mas não sincronizado.
 */
export const PUT = apiRoute<"access", { kind: string }>(
  { guard: "access" },
  async ({ userId, params, body, request }) =>
    saveReminder(
      userId,
      reminderKindSchema.parse(params.kind),
      await body(reminderUpsertSchema),
      appUrl(request.nextUrl.origin),
    ),
);

export const DELETE = apiRoute<"access", { kind: string }>({ guard: "access" }, async ({ userId, params }) => {
  if (!(await removeReminder(userId, reminderKindSchema.parse(params.kind)))) throw notFound("Lembrete");
  return { deleted: true };
});
