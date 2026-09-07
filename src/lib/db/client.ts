import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __dbClient: postgres.Sql | undefined;
}

/**
 * Conexão única (reaproveitada entre hot-reloads em dev) com o Postgres do
 * Supabase. Usada só em código server-only — ver `docs/06-seguranca.md` e a
 * nota em `src/lib/auth/session.ts` sobre como o isolamento por usuário é
 * garantido nesta via (não é via RLS/JWT, é via `userId` obrigatório em
 * todo repository).
 */
const client =
  globalThis.__dbClient ??
  postgres(process.env.DATABASE_URL!, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalThis.__dbClient = client;
}

export const db = drizzle(client, { schema });
