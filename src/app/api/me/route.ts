import { apiRoute, notFound } from "@/lib/api/handler";
import { toProfileRow, toSubscriptionRow } from "@/lib/api/mappers";
import * as repository from "@/lib/modules/conta/repository";
import { updateProfileSchema } from "@/lib/modules/conta/schema";
import { accountDeletionSchema, deleteAccount } from "@/lib/modules/conta/self-service";
import type { MeResponse, ProfileRow } from "@/types/database";

/** Perfil + assinatura do usuário logado. Não exige assinatura ativa. */
export const GET = apiRoute({ guard: "user" }, async ({ userId }): Promise<MeResponse> => {
  const [profile, subscription] = await Promise.all([
    repository.getProfile(userId),
    repository.getSubscription(userId),
  ]);
  if (!profile) throw notFound("Perfil");

  return {
    profile: toProfileRow(profile),
    subscription: subscription ? toSubscriptionRow(subscription) : null,
  };
});

/** Atualiza nome/avatar/fuso/celular. `role` e `email` são rejeitados (strict). */
export const PATCH = apiRoute({ guard: "user" }, async ({ userId, body }): Promise<ProfileRow> => {
  const input = await body(updateProfileSchema);
  const updated = await repository.updateProfile(userId, input);
  if (!updated) throw notFound("Perfil");
  return toProfileRow(updated);
});

/**
 * DELETE /api/me — `AccountDeletion` ({ confirm: "EXCLUIR", password }).
 * Exclusão definitiva pelo titular (LGPD). 422 senha errada · 409 master.
 */
export const DELETE = apiRoute({ guard: "user" }, async ({ userId, body }) => {
  await deleteAccount(userId, await body(accountDeletionSchema));
  return { deleted: true };
});
