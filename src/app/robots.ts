import type { MetadataRoute } from "next";
import { APP_CONFIG } from "@/lib/app-config";

export default function robots(): MetadataRoute.Robots {
  return {
    // "/$" = só a página inicial (onde o site aparece para visitantes); o
    // resto da raiz é o app, que não deve ser indexado.
    rules: { userAgent: "*", allow: ["/$", "/site", "/termos", "/privacidade", "/faq"], disallow: "/" },
    sitemap: `${APP_CONFIG.url}/sitemap.xml`,
  };
}
