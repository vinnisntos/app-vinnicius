"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "claro" | "escuro" | "sistema";
const options = [
  { value: "claro", label: "Claro", icon: Sun },
  { value: "escuro", label: "Escuro", icon: Moon },
  { value: "sistema", label: "Sistema", icon: Monitor },
] as const;

function subscribe(listener: () => void) {
  window.addEventListener("theme-change", listener);
  return () => window.removeEventListener("theme-change", listener);
}

function currentTheme(): Theme {
  const value = document.documentElement.dataset.themePreference;
  return value === "claro" || value === "escuro" ? value : "sistema";
}

function chooseTheme(value: Theme) {
  const root = document.documentElement;
  root.dataset.themePreference = value;
  root.classList.toggle("dark", value === "escuro" || (value === "sistema" && matchMedia("(prefers-color-scheme: dark)").matches));
  document.cookie = `theme=${value}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  window.dispatchEvent(new Event("theme-change"));
}

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "sistema");
  return <div role="group" aria-label="Tema" className={`inline-flex items-center gap-0.5 rounded-xl border border-glass-border bg-glass p-1 shadow-sm backdrop-blur-md ${compact ? "text-[11px]" : "text-xs"}`}>
    {options.map(({ value, label, icon: Icon }) => <button key={value} type="button" aria-pressed={theme === value} onClick={() => chooseTheme(value)} className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-lg px-2 font-semibold transition-colors ${theme === value ? "bg-brand-600 text-on-brand" : "text-text-secondary hover:bg-brand-soft hover:text-brand-strong"}`}><Icon className="size-4" aria-hidden /><span>{label}</span></button>)}
  </div>;
}
