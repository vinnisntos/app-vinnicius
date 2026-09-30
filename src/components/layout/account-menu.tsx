"use client";
import { useState } from "react";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useAccess } from "@/components/access/access-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { signOut } from "@/lib/auth/actions";
import { ThemeSelector } from "@/components/theme/theme-selector";
import { NAV_ITEMS } from "./nav-items";
export function AccountMenu() {
  const [open, setOpen] = useState(false); const { role } = useAccess();
  return <><button type="button" aria-label="Abrir menu da conta" onClick={() => setOpen(true)} className="ml-auto flex size-11 items-center justify-center rounded-full border border-glass-border bg-glass text-text-secondary"><UserRound aria-hidden /></button><Sheet open={open} onOpenChange={setOpen}><SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-3xl border-glass-border bg-surface-solid p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><SheetHeader className="px-0"><SheetTitle>Conta e opções</SheetTitle></SheetHeader><div className="my-4"><p className="mb-2 text-sm font-semibold">Aparência</p><ThemeSelector /></div><nav aria-label="Menu da conta" className="grid grid-cols-2 gap-2">{NAV_ITEMS.filter((item) => item.mobile === "menu" && (!item.masterOnly || role === "master")).map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex min-h-14 items-center gap-2 rounded-xl border border-glass-border px-3 text-sm text-text-secondary"><item.icon className="size-5" aria-hidden />{item.label}</Link>)}</nav><form action={signOut} className="mt-3"><Button variant="ghost" className="h-12 w-full justify-start gap-3 text-text-secondary"><LogOut aria-hidden />Sair</Button></form></SheetContent></Sheet></>;
}
