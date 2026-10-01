import { track } from "@/lib/modules/analytics/track";
import type { CancelReason } from "@/types/database";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAccessStatus } from "@/lib/access/status";
import { ApiHttpError } from "@/lib/api/handler";
import { passwordSchema } from "@/lib/auth/schema";
import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema";
import { asaas, AsaasError, isAsaasConfigured } from "@/lib/integrations/asaas/client";
import { disconnectGoogle } from "@/lib/modules/lembretes/service";
import { createAdminClient, verifyPassword } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CancelSubscriptionResponse } from "@/types/database";
import { getProfile, getSubscription } from "./repository";

/**
 * Autoatendimento (Fase 12): cancelar assinatura, trocar senha e excluir a
 * conta sem depender do suporte humano. Ações sensíveis exigem a senha atual.
 */

export const passwordChangeSchema = z
  .object({ current_password: z.string().min(1, "Informe a senha atual."), new_password: passwordSchema })
  .strict()
  .refine((v) => v.current_password !== v.new_password, {
    message: "A nova senha precisa ser diferente da atual.",
    path: ["new_password"],
  });

export const accountDeletionSchema = z
  .object({
    confirm: z.literal("EXCLUIR", { message: 'Digite EXCLUIR para confirmar.' }),
    password: z.string().min(1, "Informe sua senha."),
  })
  .strict();

async function requireEmail(userId: string) {
  const profile = await getProfile(userId);
  if (!profile?.email) throw new ApiHttpError(409, "conflict", "Conta sem e-mail cadastrado. Fale com o suporte.");
  return profile.email;
}

async function assertPassword(userId: string, password: string) {
  if (!(await verifyPassword(await requireEmail(userId), password))) {
    throw new ApiHttpError(422, "validation", "Senha incorreta.", { password: ["Senha incorreta."] });
  }
}

/** Cancela a cobrança recorrente no Asaas (404 = já não existe: ok). */
async function cancelAtAsaas(asaasSubscriptionId: string | null) {
  if (!asaasSubscriptionId || !isAsaasConfigured()) return;
  try {
    await asaas.cancelSubscription(asaasSubscriptionId);
  } catch (error) {
    if (error instanceof AsaasError && error.status === 404) return;
    throw error;
  }
}

/**
 * Cancela a assinatura: para as cobranças futuras e mantém o acesso até o
 * fim do período já pago (a regra de expiração está em get_access_status).
 */
export async function cancelSubscription(
  userId: string,
  input: { reason?: CancelReason; note?: string } = {},
): Promise<CancelSubscriptionResponse> {
  const access = await getAccessStatus(userId);
  if (access.access_state === "master") {
    throw new ApiHttpError(409, "conflict", "Conta de administrador não tem assinatura.");
  }
  if (access.access_state !== "active") {
    throw new ApiHttpError(409, "conflict", "Não há assinatura ativa para cancelar.");
  }
  const sub = await getSubscription(userId);
  if (!sub) throw new ApiHttpError(404, "not_found", "Assinatura não encontrada.");
  if (sub.cancelRequestedAt) {
    return { cancel_requested_at: sub.cancelRequestedAt.toISOString(), access_until: sub.currentPeriodEnd?.toISOString() ?? null };
  }

  try {
    await cancelAtAsaas(sub.asaasSubscriptionId);
  } catch (error) {
    console.error("[asaas] cancelamento", error);
    throw new ApiHttpError(502, "upstream", "Não foi possível cancelar no provedor de pagamento. Tente novamente.");
  }

  const [row] = await db
    .update(subscriptions)
    .set({
      cancelRequestedAt: new Date(),
      cancelReason: input.reason ?? null,
      cancelReasonNote: input.note || null,
    })
    .where(eq(subscriptions.userId, userId))
    .returning();
  await track(userId, "subscription_canceled", { reason: input.reason });
  return {
    cancel_requested_at: row.cancelRequestedAt!.toISOString(),
    access_until: row.currentPeriodEnd?.toISOString() ?? null,
  };
}

/** Troca de senha com a sessão atual, após conferir a senha antiga. */
export async function changePassword(userId: string, input: z.infer<typeof passwordChangeSchema>) {
  await assertPassword(userId, input.current_password);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: input.new_password });
  if (error) {
    if (error.code === "weak_password") throw new ApiHttpError(422, "validation", "Senha fraca demais.", { new_password: ["Senha fraca demais."] });
    throw new ApiHttpError(502, "upstream", "Não foi possível trocar a senha. Tente novamente.");
  }
}

/**
 * Exclusão definitiva da conta pelo titular (LGPD): confere a senha, para
 * cobranças e integrações externas, apaga o usuário no Auth (cascade apaga
 * todos os dados) e encerra a sessão. Master não se exclui por aqui — evita
 * deixar o produto sem administrador.
 */
export async function deleteAccount(userId: string, input: z.infer<typeof accountDeletionSchema>) {
  const access = await getAccessStatus(userId);
  if (access.access_state === "master") {
    throw new ApiHttpError(409, "conflict", "A conta de administrador não pode ser excluída por aqui.");
  }
  await assertPassword(userId, input.password);

  const sub = await getSubscription(userId);
  await cancelAtAsaas(sub?.asaasSubscriptionId ?? null).catch((error) => console.error("[asaas] exclusão de conta", error));
  await disconnectGoogle(userId).catch((error) => console.error("[google] exclusão de conta", error));

  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) {
    console.error("[auth] exclusão de conta", error.message);
    throw new ApiHttpError(502, "upstream", "Não foi possível excluir a conta agora. Tente novamente.");
  }
  const supabase = await createClient();
  await supabase.auth.signOut().catch(() => undefined);
}
