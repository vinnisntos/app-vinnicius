"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, Clock3, Sparkles } from "lucide-react";
import { useAccess } from "@/components/access/access-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { shouldShowNagPopup } from "@/lib/access/nag";

const STORAGE_KEY_PREFIX = "lifeos.nag.lastShownAt";

function countdownLabel(days = 0, hours = 0, minutes = 0) {
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${Math.max(0, minutes)}min`;
}

export function NagController({ userId }: { userId: string }) {
  const { nagMode, countdown } = useAccess();
  const router = useRouter();
  const [softOpen, setSoftOpen] = useState(false);
  const storageKey = `${STORAGE_KEY_PREFIX}:${userId}`;

  useEffect(() => {
    const id = setTimeout(() => {
      if (nagMode !== "soft") {
        setSoftOpen(false);
        return;
      }
      const now = Date.now();
      let lastShownAt: number | null = null;
      try {
        const raw = localStorage.getItem(storageKey);
        lastShownAt = raw ? Number(raw) : null;
      } catch {
        lastShownAt = null;
      }
      if (shouldShowNagPopup(nagMode, countdown, lastShownAt, now)) {
        setSoftOpen(true);
        try {
          localStorage.setItem(storageKey, String(now));
        } catch {
          // O armazenamento pode estar indisponível; o aviso continua funcional.
        }
      }
    }, 0);
    return () => clearTimeout(id);
  }, [nagMode, countdown, storageKey]);

  if (nagMode === "none") return null;
  const label = countdownLabel(countdown?.days, countdown?.hours, countdown?.minutes);
  const urgent = countdown?.isLastDay ?? false;
  const blocking = nagMode === "blocking";

  return (
    <>
      {!blocking ? (
        <div className={`fixed inset-x-0 top-0 z-40 flex min-h-12 items-center justify-center gap-2 border-b px-3 py-2 text-center text-xs font-semibold backdrop-blur-xl md:left-64 ${urgent ? "border-red-400/30 bg-red-950/85 text-red-100" : "border-brand-400/20 bg-brand-900/85 text-purple-100"}`} style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }} role="status">
          <Clock3 className="size-4 shrink-0" aria-hidden />
          Seu teste termina em {label}.
          <Link href="/assinar" className="underline underline-offset-2 focus-visible:outline focus-visible:outline-2">Assinar</Link>
        </div>
      ) : null}

      <Dialog open={blocking || softOpen} onOpenChange={blocking ? undefined : setSoftOpen}>
        <DialogContent showCloseButton={!blocking} onEscapeKeyDown={blocking ? (event) => event.preventDefault() : undefined} onPointerDownOutside={blocking ? (event) => event.preventDefault() : undefined} className={`border bg-zinc-950/95 p-6 backdrop-blur-xl ${urgent || blocking ? "border-red-400/30 shadow-[0_0_50px_rgb(239_68_68/0.14)]" : "border-brand-400/20 shadow-[var(--shadow-glow)]"}`}>
          <DialogHeader>
            <div className={`mb-2 flex size-12 items-center justify-center rounded-2xl ${urgent || blocking ? "bg-red-500/15 text-red-300" : "bg-brand-500/15 text-brand-400"}`}>
              {urgent || blocking ? <AlertTriangle aria-hidden /> : <Sparkles aria-hidden />}
            </div>
            <DialogTitle className="text-xl">{blocking ? "Seu acesso precisa ser renovado" : urgent ? "Últimas horas do seu teste" : "Continue construindo sua rotina"}</DialogTitle>
            <DialogDescription className="leading-relaxed">{blocking ? "Assine para voltar a registrar refeições, água, peso e acompanhar sua evolução." : `Você ainda tem ${label} para experimentar todos os recursos do Life OS.`}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 border-white/10 bg-white/5">
            <Button className="h-11 w-full shadow-[var(--shadow-glow)] sm:w-auto" onClick={() => router.replace("/assinar")}>Ver assinatura</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
