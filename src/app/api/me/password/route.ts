import { apiRoute } from "@/lib/api/handler";
import { changePassword, passwordChangeSchema } from "@/lib/modules/conta/self-service";

/** POST /api/me/password — `PasswordChange`. 422 senha atual incorreta/fraca. */
export const POST = apiRoute({ guard: "user" }, async ({ userId, body }) => {
  await changePassword(userId, await body(passwordChangeSchema));
  return { changed: true };
});
