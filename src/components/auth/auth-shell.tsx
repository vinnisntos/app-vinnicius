import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";

export function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(147,51,234,0.28),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.12),transparent_35%)] px-4 py-10 [padding-top:max(2.5rem,env(safe-area-inset-top))] [padding-bottom:max(2.5rem,env(safe-area-inset-bottom))]">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[size:44px_44px] opacity-[0.06] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)]" />
      <div className="relative z-10 w-full max-w-md">
        <Logo className="mb-8 justify-center" />
        <section className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{description}</p>
          <div className="mt-7">{children}</div>
        </section>
      </div>
    </main>
  );
}
