"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";

const BRAND = (
  <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
    Life OS
  </p>
);

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar fixa — desktop */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-white/10 md:px-4 md:py-6">
        <div className="mb-8 px-2">{BRAND}</div>
        <div className="flex-1">
          <SidebarNav />
        </div>
        <SignOutButton />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — mobile */}
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:hidden">
          {BRAND}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-white/10 bg-background px-4 py-6">
              <SheetTitle className="mb-8 px-2">{BRAND}</SheetTitle>
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
              <div className="mt-auto pt-6">
                <SignOutButton />
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
