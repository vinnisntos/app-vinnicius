/*
 * Service worker do PWA. Escopo deliberadamente conservador:
 *
 * - Assets versionados (/_next/static, ícones): cache-first — o hash no nome
 *   do arquivo garante que nunca ficam obsoletos.
 * - Navegação: network-first, com /offline como fallback. HTML autenticado
 *   NUNCA é gravado em cache — num aparelho compartilhado, o próximo usuário
 *   veria a tela do anterior após o logout.
 * - /api/*: sempre rede. Dado do usuário não passa por cache do SW; o cache
 *   otimista de refeições/água vive no cliente (fila local reenviada ao
 *   voltar a conexão — rotas são idempotentes por id gerado no cliente).
 *
 * Bump de CACHE_VERSION invalida tudo no próximo activate.
 */
const CACHE_VERSION = "v1";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const OFFLINE_CACHE = `offline-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      // Tolerante: se /offline falhar, o SW ainda instala (só perde o fallback).
      .then((cache) => cache.add(OFFLINE_URL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== OFFLINE_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/pwa-icon/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(OFFLINE_CACHE);
        return (await cache.match(OFFLINE_URL)) ?? Response.error();
      }),
    );
  }
});
