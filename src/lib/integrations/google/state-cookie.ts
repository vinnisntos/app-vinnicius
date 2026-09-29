/**
 * Cookie de ida-e-volta do OAuth: state (anti-CSRF), verifier PKCE e o
 * userId que iniciou o fluxo — o callback só aceita se a sessão atual for
 * do mesmo usuário (impede "login CSRF" que ligaria a agenda de outra
 * pessoa à conta da vítima).
 */
export const OAUTH_COOKIE = "g_oauth";
export const OAUTH_COOKIE_PATH = "/api/integrations/google";

export type OAuthCookie = { state: string; verifier: string; uid: string };

export function encodeOAuthCookie(value: OAuthCookie): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeOAuthCookie(raw: string | undefined): OAuthCookie | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return typeof parsed?.state === "string" && typeof parsed?.verifier === "string" && typeof parsed?.uid === "string"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export const oauthCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const, // precisa voltar no redirect top-level do Google
  path: OAUTH_COOKIE_PATH,
  maxAge: 600,
};
