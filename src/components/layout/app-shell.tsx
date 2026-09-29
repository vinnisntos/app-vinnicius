"use client";

import type { ReactNode } from "react";
import { useAccess } from "@/components/access/access-provider";
import { NagController } from "@/components/access/nag-controller";
import { Logo } from "./logo";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { AccountMenu } from "./account-menu";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";

export function AppShell({ children, userId }: { children: ReactNode; userId: string }) {
  const { nagMode } = useAccess();
  return (
    <div className={`flex min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(147,51,234,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.08),transparent_30%)] ${nagMode === "soft" ? "pt-[calc(3rem+env(safe-area-inset-top))] md:pt-10" : ""}`}>
      <NagController userId={userId} />
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-white/10 md:bg-black/10 md:px-4 md:py-6 md:backdrop-blur-md">
        <div className="mb-8 px-2"><Logo /></div>
        <div className="flex-1"><SidebarNav /></div>
        <SignOutButton />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center border-b border-white/10 bg-black/10 px-4 py-3 backdrop-blur-md md:hidden"><Logo /><AccountMenu /></header>
        <main className="flex-1 px-4 pb-28 pt-6 [padding-top:calc(1.5rem+env(safe-area-inset-top))] md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
