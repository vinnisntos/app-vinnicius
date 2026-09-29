import { NextResponse } from "next/server";
import { ApiHttpError, apiRoute } from "@/lib/api/handler";
import { buildAuthUrl, createOAuthState, isGoogleConfigured } from "@/lib/integrations/google/oauth";
import { encodeOAuthCookie, OAUTH_COOKIE, oauthCookieOptions } from "@/lib/integrations/google/state-cookie";

/**
 * GET /api/integrations/google/connect — inicia o OAuth. Usar como LINK
 * (<a href>), não fetch nem <form>: é navegação top-level até o Google.
 */
export const GET = apiRoute({ guard: "access" }, async ({ userId, request }) => {
  if (!isGoogleConfigured()) {
    throw new ApiHttpError(502, "upstream", "Integração com o Google Agenda indisponível.");
  }
  const { state, verifier, challenge } = createOAuthState();
  const response = NextResponse.redirect(
    buildAuthUrl({ origin: request.nextUrl.origin, state, challenge }),
  );
  response.cookies.set(OAUTH_COOKIE, encodeOAuthCookie({ state, verifier, uid: userId }), oauthCookieOptions);
  return response;
});
