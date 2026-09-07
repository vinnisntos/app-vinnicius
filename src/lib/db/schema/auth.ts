import { pgSchema, uuid } from "drizzle-orm/pg-core";

/**
 * Referência somente-leitura a `auth.users`, gerenciada pelo Supabase Auth.
 * Nunca migrada por este projeto — existe só para tipar as foreign keys
 * `user_id` dos módulos de domínio.
 */
export const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});
