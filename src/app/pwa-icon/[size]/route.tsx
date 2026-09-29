import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { APP_CONFIG, PWA_ICON_SIZES } from "@/lib/app-config";

/**
 * Ícones PNG do PWA gerados a partir da mesma marca do LogoMark
 * (src/components/layout/logo.tsx) — sem binário versionado no repo.
 * `?maskable=1` encolhe a arte para a zona segura de 80% exigida por ícones
 * maskable.
 */
export function generateStaticParams() {
  return PWA_ICON_SIZES.map((size) => ({ size: String(size) }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ size: string }> },
) {
  const size = Number((await params).size);
  if (!PWA_ICON_SIZES.includes(size as (typeof PWA_ICON_SIZES)[number])) {
    return new Response("Not found", { status: 404 });
  }

  const maskable = request.nextUrl.searchParams.has("maskable");
  const glyph = Math.round(size * (maskable ? 0.6 : 0.78));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: maskable ? APP_CONFIG.brandColor : "transparent",
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24">
          {!maskable && <rect width="24" height="24" rx="6" fill={APP_CONFIG.brandColor} />}
          <path
            d="M3.5 13h3.2l2-5.2L12 18l2.3-5h6.2"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=604800, immutable" },
    },
  );
}
