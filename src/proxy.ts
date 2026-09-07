import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const isDev = process.env.NODE_ENV !== "production";

function buildCsp(nonce: string) {
  // 'unsafe-eval' só em dev — Fast Refresh (Turbopack e webpack) usa eval()
  // para aplicar hot-reload. O nonce é o que permite ao Next.js executar o
  // próprio script inline de bootstrap (que define window.__next_r) sem
  // precisar de 'unsafe-inline' — ver docs/06-seguranca.md.
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = await updateSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
