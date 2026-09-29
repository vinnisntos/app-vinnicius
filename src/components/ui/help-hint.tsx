"use client";

import { CircleHelp } from "lucide-react";
import { Popover } from "radix-ui";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { HelpTooltipRow } from "@/types/database";

type HelpContent = Pick<HelpTooltipRow, "title" | "body"> | undefined;

export function HelpHint({ help, className }: { help: HelpContent; className?: string }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (!help) return null;

  const openHint = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={help.title ? `Ajuda: ${help.title}` : "Abrir ajuda"}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-500",
            className,
          )}
          onMouseEnter={openHint}
          onMouseLeave={scheduleClose}
        >
          <CircleHelp className="size-4" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content onMouseEnter={openHint} onMouseLeave={scheduleClose} sideOffset={8} collisionPadding={16} className="z-[80] w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-zinc-900/95 p-4 text-sm shadow-2xl backdrop-blur-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          {help.title ? <p className="mb-1 font-semibold text-white">{help.title}</p> : null}
          <p className="leading-relaxed text-zinc-300">{help.body}</p>
          <Popover.Arrow className="fill-zinc-900" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
