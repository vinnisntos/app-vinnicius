import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Client Supabase para uso em Server Components, Server Actions e Route
 * Handlers. Nunca importar em código que possa chegar ao bundle do cliente.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de um Server Component (sem permissão para
            // escrever cookie) — o middleware já cuida do refresh de sessão.
          }
        },
      },
    },
  );
}
