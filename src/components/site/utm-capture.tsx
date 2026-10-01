"use client";

import { useEffect, useRef } from "react";

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const STORAGE_KEY = "signup_utm";

type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

/** Lê os UTMs da URL (e guarda na sessão) ou recupera os já guardados. */
function readUtm(): Utm {
  const params = new URLSearchParams(window.location.search);
  const fromUrl: Utm = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim().slice(0, 120);
    if (value) fromUrl[key] = value;
  }
  try {
    if (Object.keys(fromUrl).length) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Utm;
    return Object.fromEntries(UTM_KEYS.filter((key) => typeof stored[key] === "string").map((key) => [key, stored[key]]));
  } catch {
    return fromUrl;
  }
}

/** Na landing: só guarda a origem para o cadastro usar depois. */
export function UtmCapture() {
  useEffect(() => {
    readUtm();
  }, []);
  return null;
}

/** No cadastro: campos ocultos com a origem (sem cookies, sem terceiros). */
export function UtmFields() {
  const container = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const utm = readUtm();
    container.current?.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
      input.value = utm[input.name as (typeof UTM_KEYS)[number]] ?? "";
    });
  }, []);
  return <span ref={container} hidden>{UTM_KEYS.map((key) => <input key={key} type="hidden" name={key} defaultValue="" />)}</span>;
}
