import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { OfflineRetryButton } from "./retry-button";

export const metadata: Metadata = { title: "Offline" };
export default function OfflinePage() {
  return <main className="flex min-h-screen items-center justify-center app-ambient px-4"><section className="w-full max-w-md rounded-3xl border border-glass-border bg-glass p-8 text-center shadow-2xl backdrop-blur-md"><div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong"><WifiOff className="size-8" aria-hidden /></div><h1 className="mt-6 text-3xl font-black tracking-tight">Você está offline</h1><p className="mt-3 text-sm leading-relaxed text-text-tertiary">Alguns dados salvos continuam disponíveis. Reconecte-se para sincronizar suas alterações e carregar novas informações.</p><OfflineRetryButton /></section></main>;
}
