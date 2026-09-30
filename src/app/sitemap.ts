import type { MetadataRoute } from "next";
import { APP_CONFIG } from "@/lib/app-config";

export default function sitemap(): MetadataRoute.Sitemap {
  // A página inicial é a raiz: visitantes sem sessão veem o site em "/".
  return ["/", "/termos", "/privacidade", "/faq"].map((path) => ({ url: `${APP_CONFIG.url}${path === "/" ? "" : path}`, changeFrequency: "monthly", priority: path === "/" ? 1 : 0.3 }));
}
