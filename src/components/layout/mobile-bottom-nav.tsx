"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
export function MobileBottomNav() {
  const pathname = usePathname();
  return <nav aria-label="Navegação principal" className="fixed inset-x-3 bottom-3 z-40 flex rounded-2xl border border-white/10 bg-zinc-950/90 p-1.5 shadow-2xl backdrop-blur-xl md:hidden" style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}>
    {NAV_ITEMS.filter((item) => item.mobile === "tab").map((item) => { const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${active ? "bg-brand-500/15 text-brand-400" : "text-zinc-300"}`}><item.icon className="size-5" aria-hidden /><span className="max-w-full truncate">{item.label}</span></Link>; })}
  </nav>;
}
