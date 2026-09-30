import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a service role — IGNORA RLS e pode excluir usuários.
 * Uso restrito a código server-side e a operações que exigem privilégio
 * (hoje: exclusão de conta pelo próprio titular, após reautenticação).
 * Nunca importar em Client Component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Confere a senha do usuário SEM tocar na sessão atual (cliente isolado,
 * sem cookies). Usado antes de ações irreversíveis ou sensíveis.
 */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  // scope "local": encerra SÓ esta sessão temporária. O padrão ("global")
  // derrubaria todas as sessões do usuário, inclusive a que está no app.
  if (!error) await client.auth.signOut({ scope: "local" });
  return !error;
}
