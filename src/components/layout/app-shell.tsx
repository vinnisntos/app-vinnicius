"use client";

import type { ReactNode } from "react";
import { useAccess } from "@/components/access/access-provider";
import { NagController } from "@/components/access/nag-controller";
import { Logo } from "./logo";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { AccountMenu } from "./account-menu";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";
import { ThemeSelector } from "@/components/theme/theme-selector";

export function AppShell({ children, userId }: { children: ReactNode; userId: string }) {
  const { nagMode } = useAccess();
  return (
    <div className={`flex min-h-screen app-ambient ${nagMode === "soft" ? "pt-[calc(3rem+env(safe-area-inset-top))] md:pt-10" : ""}`}>
      <NagController userId={userId} />
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-glass-border md:bg-surface-muted md:px-4 md:py-6 md:backdrop-blur-md">
        <div className="mb-8 px-2"><Logo /></div>
        <div className="flex-1"><SidebarNav /></div>
        <div className="mb-3"><p className="mb-2 px-2 text-xs font-semibold text-text-secondary">Aparência</p><ThemeSelector compact /></div>
        <SignOutButton />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center border-b border-glass-border bg-surface-muted px-4 py-3 backdrop-blur-md md:hidden"><Logo /><AccountMenu /></header>
        <main className="flex-1 px-4 pb-28 pt-6 [padding-top:calc(1.5rem+env(safe-area-inset-top))] md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
