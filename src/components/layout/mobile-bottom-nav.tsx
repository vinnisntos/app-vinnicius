"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, LogOut } from "lucide-react";
import { useState } from "react";
import { useAccess } from "@/components/access/access-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type NavItem } from "./nav-items";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500", active ? "bg-brand-500/15 text-brand-400" : "text-zinc-400 active:bg-white/10")}>
      <item.icon className="size-5" aria-hidden />
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { role } = useAccess();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = NAV_ITEMS.filter((item) => !item.masterOnly || role === "master");
  const visible = items.slice(0, 4);
  const overflow = items.slice(4);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const overflowActive = overflow.some((item) => isActive(item.href));

  return (
    <>
      <nav aria-label="Navegação principal" className="fixed inset-x-3 bottom-3 z-40 flex rounded-2xl border border-white/10 bg-zinc-950/80 p-1.5 shadow-2xl backdrop-blur-xl md:hidden" style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}>
        {visible.map((item) => <NavLink key={item.href} item={item} active={isActive(item.href)} />)}
        {overflow.length ? (
          <button type="button" onClick={() => setMoreOpen(true)} aria-label="Abrir mais opções" className={cn("flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-500", overflowActive ? "bg-brand-500/15 text-brand-400" : "text-zinc-400")}>
            <Ellipsis className="size-5" aria-hidden /><span>Mais</span>
          </button>
        ) : null}
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-white/10 bg-zinc-950/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
          <SheetHeader className="px-0"><SheetTitle>Mais opções</SheetTitle></SheetHeader>
          <nav className="grid grid-cols-2 gap-2" aria-label="Mais opções">
            {overflow.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className={cn("flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500", isActive(item.href) ? "bg-brand-500/15 text-brand-300" : "bg-white/5 text-zinc-300")}>
                <item.icon className="size-5" aria-hidden />{item.label}
              </Link>
            ))}
          </nav>
          <form action={signOut} className="mt-3"><Button variant="ghost" className="h-12 w-full justify-start gap-3 text-zinc-400"><LogOut aria-hidden /> Sair</Button></form>
        </SheetContent>
      </Sheet>
    </>
  );
}
