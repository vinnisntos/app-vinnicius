import type { MetadataRoute } from "next";
import { APP_CONFIG, PWA_ICON_SIZES } from "@/lib/app-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_CONFIG.name,
    short_name: APP_CONFIG.shortName,
    description: APP_CONFIG.description,
    lang: APP_CONFIG.locale,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: APP_CONFIG.backgroundColor,
    theme_color: APP_CONFIG.backgroundColor,
    categories: ["health", "fitness", "lifestyle"],
    icons: PWA_ICON_SIZES.flatMap((size) => [
      { src: `/pwa-icon/${size}`, sizes: `${size}x${size}`, type: "image/png", purpose: "any" as const },
      // Maskable: mesma arte com margem de segurança (o SO recorta em círculo/squircle).
      { src: `/pwa-icon/${size}?maskable=1`, sizes: `${size}x${size}`, type: "image/png", purpose: "maskable" as const },
    ]),
    shortcuts: [
      { name: "Registrar refeição", url: "/alimentacao" },
      { name: "Comunidade", url: "/comunidade" },
    ],
  };
}
