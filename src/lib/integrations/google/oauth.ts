import { createHash, randomBytes } from "node:crypto";
import { isEncryptionConfigured } from "@/lib/integrations/crypto";

/**
 * OAuth 2.0 do Google (Authorization Code + PKCE, access_type=offline) para
 * obter um refresh token com escopo mínimo: só eventos da agenda.
 *
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_TOKEN_ENCRYPTION_KEY.
 * Redirect URI cadastrado no Google Cloud Console:
 *   <APP_URL>/api/integrations/google/callback
 *
 * Custo zero: Calendar API é gratuita dentro da cota padrão.
 */

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "openid",
  "email",
] as const;

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && isEncryptionConfigured(),
  );
}

export class GoogleAuthError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
  /** Refresh token revogado/expirado — usuário precisa reconectar. */
  get isInvalidGrant() {
    return this.code === "invalid_grant";
  }
}

export function redirectUri(origin: string): string {
  return `${(process.env.APP_URL || origin).replace(/\/$/, "")}/api/integrations/google/callback`;
}

/** state + PKCE, guardados em cookie httpOnly até o callback. */
export function createOAuthState() {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

export function buildAuthUrl(input: { origin: string; state: string; challenge: string }): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(input.origin),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    // Garante refresh_token mesmo se o usuário já autorizou antes.
    prompt: "consent",
    include_granted_scopes: "true",
    state: input.state,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_URL}?${params}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      ...body,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok || json.error) {
    throw new GoogleAuthError(json.error ?? `http_${response.status}`, json.error_description);
  }
  return json;
}

export async function exchangeCode(input: { code: string; verifier: string; origin: string }) {
  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    code: input.code,
    code_verifier: input.verifier,
    redirect_uri: redirectUri(input.origin),
  });
  if (!tokens.refresh_token) throw new GoogleAuthError("no_refresh_token");
  if (!tokens.scope.includes("calendar.events")) throw new GoogleAuthError("scope_denied");

  return {
    refreshToken: tokens.refresh_token,
    scope: tokens.scope,
    email: emailFromIdToken(tokens.id_token),
  };
}

/**
 * Payload do id_token sem verificar assinatura: aceitável SÓ porque ele veio
 * direto do endpoint de token do Google, em chamada server-to-server via TLS
 * autenticada com o client_secret. Usado apenas para exibir o e-mail.
 */
function emailFromIdToken(idToken: string | undefined): string | null {
  try {
    const payload = JSON.parse(Buffer.from(idToken!.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

// Cache de access token em memória (processo único no container standalone).
const accessTokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function getAccessToken(cacheKey: string, refreshToken: string): Promise<string> {
  const cached = accessTokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const tokens = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
  accessTokenCache.set(cacheKey, {
    token: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });
  return tokens.access_token;
}

export function forgetAccessToken(cacheKey: string) {
  accessTokenCache.delete(cacheKey);
}

/** Melhor esforço: se falhar, a conexão local é apagada do mesmo jeito. */
export async function revokeToken(token: string) {
  await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => undefined);
}
