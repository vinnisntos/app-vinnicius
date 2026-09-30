import type { MetadataRoute } from "next";
import { APP_CONFIG } from "@/lib/app-config";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/site", "/termos", "/privacidade"].map((path) => ({ url: `${APP_CONFIG.url}${path}`, changeFrequency: "monthly", priority: path === "/site" ? 1 : 0.3 }));
}
