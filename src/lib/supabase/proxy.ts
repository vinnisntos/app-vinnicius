import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Telas de quem ainda não entrou — usuário logado é mandado para "/". */
const AUTH_PAGES = ["/login", "/cadastro", "/esqueci-senha"];

/** Acessíveis com ou sem sessão. */
const OPEN_PATHS = ["/auth/", "/faq", "/offline", "/site", "/termos", "/privacidade", "/robots.txt", "/sitemap.xml"];

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

  // O módulo foi retirado: a rota antiga deve responder 404 para todos.
  if (pathname === "/financeiro" || pathname.startsWith("/financeiro/")) {
    return supabaseResponse;
  }

  const isAuthPage = startsWithAny(pathname, AUTH_PAGES);
  const isPublicPath = isAuthPage || startsWithAny(pathname, OPEN_PATHS);

  // O rewrite preserva a URL pública e repassa o nonce e cookies renovados.
  const navigationResponse = (url: URL, rewrite = false) => {
    const response = rewrite
      ? NextResponse.rewrite(url, { request: { headers: requestHeaders } })
      : NextResponse.redirect(url);
    supabaseResponse.headers.forEach((value, name) => {
      if (name !== "set-cookie" && !name.startsWith("x-middleware-")) response.headers.set(name, value);
    });
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) =>
      response.cookies.set(name, value, options),
    );
    return response;
  };

  if (!user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/site";
    return navigationResponse(url, true);
  }

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return navigationResponse(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return navigationResponse(url);
  }

  return supabaseResponse;
}
