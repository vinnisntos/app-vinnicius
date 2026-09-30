"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccess } from "@/components/access/access-provider";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { role } = useAccess();
  const items = NAV_ITEMS.filter((item) => !item.masterOnly || role === "master");

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
              isActive
                ? "bg-brand-soft text-brand-strong border border-brand-500/20"
                : "text-text-tertiary hover:bg-glass hover:text-foreground border border-transparent",
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
