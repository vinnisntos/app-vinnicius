import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase para uso em Client Components. Só tem acesso à anon key
 * (pública por natureza) — nunca importar a service-role key aqui.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
