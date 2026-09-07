import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Fonte única do `userId` autenticado para toda a camada de repository.
 *
 * Nota de arquitetura: o Drizzle fala com o Postgres via connection string
 * direta (`DATABASE_URL`), não via PostgREST — então a sessão SQL não carrega
 * o JWT do usuário e a policy de RLS `auth.uid() = user_id` não é reavaliada
 * nessa via (RLS aqui é defesa em profundidade para um eventual acesso via
 * supabase-js/anon key, não a fonte de verdade do isolamento). O isolamento
 * real do caminho Drizzle é este: todo repository exige `userId` como
 * primeiro parâmetro, resolvido *apenas* aqui — nunca opcional, nunca
 * hardcoded. Ver `docs/06-seguranca.md`.
 */
export async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user.id;
}
