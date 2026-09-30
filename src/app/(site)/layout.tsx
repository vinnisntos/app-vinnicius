import type { ReactNode } from "react";
import { ThemeSelector } from "@/components/theme/theme-selector";
import { APP_CONFIG } from "@/lib/app-config";
import Link from "next/link";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <div className="site-shell min-h-dvh bg-background text-foreground">
    <header className="sticky top-0 z-40 border-b border-border bg-glass backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link href="/site" className="text-lg font-bold tracking-tight text-brand-strong">{APP_CONFIG.name}</Link>
        <div className="flex items-center gap-3"><ThemeSelector compact /><Link href="/login" className="hidden text-sm font-semibold text-foreground sm:inline">Entrar</Link></div>
      </div>
    </header>
    {children}
  </div>;
}
