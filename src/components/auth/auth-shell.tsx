import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";

export function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden app-ambient px-4 py-10 [padding-top:max(2.5rem,env(safe-area-inset-top))] [padding-bottom:max(2.5rem,env(safe-area-inset-bottom))]">
      <div aria-hidden className="pointer-events-none absolute inset-0 auth-grid" />
      <div className="relative z-10 w-full max-w-md">
        <Logo className="mb-8 justify-center" />
        <section className="rounded-3xl border border-glass-border bg-glass p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-strong">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-tertiary">{description}</p>
          <div className="mt-7">{children}</div>
        </section>
      </div>
    </main>
  );
}
