import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api/handler";
import { GoogleAuthError } from "@/lib/integrations/google/oauth";
import { decodeOAuthCookie, OAUTH_COOKIE, OAUTH_COOKIE_PATH } from "@/lib/integrations/google/state-cookie";
import { connectGoogle } from "@/lib/modules/lembretes/service";

/**
 * Retorno do Google. Sempre termina num redirect para /lembretes com
 * `?google=connected` ou `?google=erro&motivo=<code>` (a UI mostra o aviso).
 */
export const GET = apiRoute({ guard: "user" }, async ({ userId, request }) => {
  const { searchParams, origin } = request.nextUrl;
  const saved = decodeOAuthCookie(request.cookies.get(OAUTH_COOKIE)?.value);

  const finish = (params: Record<string, string>) => {
    const url = new URL("/lembretes", origin);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const response = NextResponse.redirect(url);
    response.cookies.set(OAUTH_COOKIE, "", { path: OAUTH_COOKIE_PATH, maxAge: 0 });
    return response;
  };

  if (searchParams.get("error")) return finish({ google: "erro", motivo: "recusado" });
  const code = searchParams.get("code");
  if (!saved || !code || saved.state !== searchParams.get("state") || saved.uid !== userId) {
    return finish({ google: "erro", motivo: "estado_invalido" });
  }

  try {
    await connectGoogle(userId, { code, verifier: saved.verifier, origin });
    return finish({ google: "connected" });
  } catch (error) {
    const motivo = error instanceof GoogleAuthError ? error.code : "falha";
    console.error("[google] callback", motivo, error);
    return finish({ google: "erro", motivo });
  }
});
