"use client";

import { useEffect } from "react";

/**
 * Registra /sw.js. Só em produção: em dev o SW cachearia chunks do Turbopack
 * e mascararia o hot-reload. Não renderiza nada.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.error("[pwa] falha ao registrar SW", error));
  }, []);

  return null;
}
