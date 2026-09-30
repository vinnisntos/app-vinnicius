"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
export const BOTTOM_ACTION_BAR_SPACER = "pb-40 md:pb-0";
export function useBottomActionBarSpacer() { return BOTTOM_ACTION_BAR_SPACER; }
export function BottomActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("fixed inset-x-3 z-30 flex min-h-16 items-center gap-2 rounded-2xl border border-glass-border bg-surface-solid p-2 shadow-2xl backdrop-blur-xl [bottom:calc(5.25rem+env(safe-area-inset-bottom))] md:sticky md:inset-x-auto md:bottom-4 md:mx-auto md:w-fit md:max-w-full", className)}>{children}</div>;
}
