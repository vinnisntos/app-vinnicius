import { apiRoute } from "@/lib/api/handler";
import { listReminders } from "@/lib/modules/lembretes/service";

/** GET /api/reminders → `RemindersResponse` (lembretes + status do Google). */
export const GET = apiRoute({ guard: "access", help: ["calendar_reminders.kind"] }, async ({ userId }) =>
  listReminders(userId),
);
