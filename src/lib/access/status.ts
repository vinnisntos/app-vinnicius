import { sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import type { AccessState, AccessStatus } from "@/types/database";

type AccessStatusRow = {
  access_state: AccessState;
  has_access: boolean;
  is_trial: boolean;
  show_nag_screen: boolean;
  is_active_subscription: boolean;
  trial_ends_at: Date | string | null;
  server_now: Date | string;
};

const toIso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

/**
 * Paywall: delega 100% da regra à função SQL `get_access_status` (migrations
 * 0003/0004) para nunca existirem duas implementações divergentes. Via
 * Drizzle a chamada roda como `postgres` (sem JWT), então a checagem
 * "só o próprio status" da função não se aplica — por isso o `userId` aqui
 * vem SEMPRE de `requireUserId()`/`getSessionUserId()`, nunca do cliente.
 */
export async function getAccessStatus(userId: string): Promise<AccessStatus> {
  const rows = await db.execute<AccessStatusRow>(
    sql`select * from public.get_access_status(${userId}::uuid)`,
  );
  const row = rows[0];

  return {
    access_state: row.access_state,
    has_access: row.has_access,
    is_trial: row.is_trial,
    show_nag_screen: row.show_nag_screen,
    is_active_subscription: row.is_active_subscription,
    trial_ends_at: row.trial_ends_at ? toIso(row.trial_ends_at) : null,
    server_now: toIso(row.server_now),
  };
}

/** Para Server Components/layouts do app: sem acesso → tela de assinatura. */
export async function requireAppAccess(userId: string): Promise<AccessStatus> {
  const access = await getAccessStatus(userId);
  if (!access.has_access) redirect("/assinar");
  return access;
}

/**
 * Páginas só do master (painel admin + módulos pessoais legados). 404 em
 * vez de 403 — não anuncia a existência da rota para assinantes.
 */
export async function requireMasterPage(userId: string): Promise<void> {
  const access = await getAccessStatus(userId);
  if (access.access_state !== "master") notFound();
}
