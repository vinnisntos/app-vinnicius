import { apiRoute } from "@/lib/api/handler";
import { disconnectGoogle, getGoogleStatus } from "@/lib/modules/lembretes/service";

/** GET — status da conexão (`GoogleCalendarStatus`); o token nunca sai. */
export const GET = apiRoute({ guard: "access", help: ["calendar_reminders.kind"] }, async ({ userId }) =>
  getGoogleStatus(userId),
);

/** DELETE — apaga os eventos criados, revoga o token e desconecta. */
export const DELETE = apiRoute({ guard: "user" }, async ({ userId }) => {
  await disconnectGoogle(userId);
  return getGoogleStatus(userId);
});
