import type { NextConfig } from "next";

// CSP fica no proxy (src/proxy.ts) — precisa de um nonce por request para
// permitir o script inline de bootstrap do próprio Next.js sem 'unsafe-inline'.
// Os demais headers de segurança são estáticos, cabem aqui.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  // Build enxuto para produção (Dockerfile copia só .next/standalone + static).
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
