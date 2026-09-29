import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Telas de quem ainda não entrou — usuário logado é mandado para "/". */
const AUTH_PAGES = ["/login", "/cadastro", "/esqueci-senha"];

/** Acessíveis com ou sem sessão. */
const OPEN_PATHS = ["/auth/", "/faq", "/offline"];

const startsWithAny = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`));

/**
 * Atualiza a sessão Supabase a cada request e bloqueia rotas privadas para
 * quem não está autenticado. Primeira linha de defesa, não a única — o
 * Proxy pode ser contornado por um matcher mal configurado, então
 * `requireUserId()` (lib/auth/session.ts) reverifica dentro do layout
 * protegido.
 *
 * `requestHeaders` (com o nonce da CSP, ver src/proxy.ts) é repassado a todo
 * `NextResponse.next()` para chegar ao render da página — sem isso o Next
 * não injeta o nonce no próprio script inline de bootstrap, e a CSP bloqueia
 * a hidratação inteira sem erro óbvio nenhum.
 */
export async function updateSession(
  request: NextRequest,
  requestHeaders: Headers,
) {
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Route Handlers decidem sozinhos (apiRoute devolve 401/402/403 em JSON;
  // webhooks não têm sessão). Redirecionar para /login quebraria o fetch.
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  const isAuthPage = startsWithAny(pathname, AUTH_PAGES);
  const isPublicPath = isAuthPage || startsWithAny(pathname, OPEN_PATHS);

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
