"use client";

import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiClientError, apiData } from "@/lib/api/client";
import type { CheckoutResponse, PublicSettings } from "@/types/database";

function messageFor(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 409 || error.code === "conflict") return "Sua assinatura já está ativa. Atualize a página para continuar.";
    if (error.status === 404) return "O checkout ainda não está disponível. Fale com o suporte para assinar.";
    if (error.status === 502 || error.code === "upstream") return "O serviço de pagamento está instável. Tente novamente ou fale com o suporte.";
    return error.message;
  }
  return "Sem conexão com o pagamento. Verifique sua internet e tente novamente.";
}

export function CheckoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [supportUrl, setSupportUrl] = useState<string | null>(null);

  useEffect(() => {
    void apiData<PublicSettings>("/api/settings")
      .then((settings) => setSupportUrl(settings.support_whatsapp_url))
      .catch(() => setSupportUrl(null));
  }, []);

  async function checkout() {
    setPending(true);
    setError(undefined);
    try {
      const data = await apiData<CheckoutResponse>("/api/billing/checkout", { method: "POST" });
      window.location.assign(data.checkout_url);
    } catch (cause) {
      setError(messageFor(cause));
      try {
        const settings = await apiData<PublicSettings>("/api/settings");
        setSupportUrl(settings.support_whatsapp_url);
      } catch {
        setSupportUrl(null);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" onClick={checkout} disabled={pending} className="h-12 w-full rounded-xl text-base shadow-[var(--shadow-glow)]">
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <ArrowRight aria-hidden />}
        {pending ? "Abrindo pagamento…" : "Assinar agora"}
      </Button>
      {error ? <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
      {supportUrl ? (
        <Button asChild variant="outline" className="h-11 w-full rounded-xl">
          <a href={supportUrl} target="_blank" rel="noreferrer"><MessageCircle aria-hidden /> Falar com o suporte</a>
        </Button>
      ) : null}
    </div>
  );
}
