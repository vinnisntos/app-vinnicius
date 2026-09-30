import type { MetadataRoute } from "next";
import { APP_CONFIG } from "@/lib/app-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/site", "/termos", "/privacidade"], disallow: "/" },
    sitemap: `${APP_CONFIG.url}/sitemap.xml`,
  };
}
