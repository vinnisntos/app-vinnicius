"use client";

import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiClientError, apiData } from "@/lib/api/client";
import type { CheckoutRequest, CheckoutResponse, PublicSettings } from "@/types/database";

function messageFor(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 409 || error.code === "conflict") return "Sua assinatura já está ativa. Atualize a página para continuar.";
    if (error.status === 403 || error.code === "forbidden") return "Seu acesso foi suspenso pela administração.";
    if (error.status === 404) return "O checkout ainda não está disponível. Fale com o suporte para assinar.";
    if (error.status === 502 || error.code === "upstream") return "O serviço de pagamento está instável. Tente novamente ou fale com o suporte.";
    return error.message;
  }
  return "Sem conexão com o pagamento. Verifique sua internet e tente novamente.";
}

export function CheckoutButton({ revoked = false }: { revoked?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [supportUrl, setSupportUrl] = useState<string | null>(null);
  const [cpf, setCpf] = useState("");
  const [cpfRequired, setCpfRequired] = useState(false);
  const [cpfErrors, setCpfErrors] = useState<string[]>([]);

  useEffect(() => {
    void apiData<PublicSettings>("/api/settings")
      .then((settings) => setSupportUrl(settings.support_whatsapp_url))
      .catch(() => setSupportUrl(null));
  }, []);

  async function checkout() {
    if (revoked) return;
    setPending(true);
    setError(undefined);
    setCpfErrors([]);
    try {
      const request: CheckoutRequest = cpfRequired ? { cpf } : {};
      const data = await apiData<CheckoutResponse>("/api/billing/checkout", { method: "POST", json: request });
      window.location.assign(data.checkout_url);
    } catch (cause) {
      if (cause instanceof ApiClientError && cause.status === 422 && cause.fields?.cpf) {
        setCpfRequired(true);
        setCpfErrors(cause.fields.cpf);
        setError("Precisamos do seu CPF para criar a cobrança.");
        return;
      }
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
      {cpfRequired && !revoked ? <div className="space-y-2"><label htmlFor="checkout-cpf" className="text-sm font-medium">CPF</label><input id="checkout-cpf" inputMode="numeric" autoComplete="off" value={cpf} onChange={(event) => { const digits = event.target.value.replace(/\D/g, "").slice(0, 11); setCpf(digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2")); setCpfErrors([]); }} className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 outline-none focus-visible:ring-2 focus-visible:ring-brand-500" placeholder="000.000.000-00" aria-invalid={!!cpfErrors.length} />{cpfErrors.map((message) => <p key={message} className="text-xs text-red-300">{message}</p>)}<p className="text-xs leading-relaxed text-zinc-400">O CPF vai direto para o processador de pagamento e não fica salvo no app.</p></div> : null}
      {!revoked ? <Button type="button" onClick={checkout} disabled={pending} className="h-12 w-full rounded-xl text-base shadow-[var(--shadow-glow)]">
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <ArrowRight aria-hidden />}
        {pending ? "Abrindo pagamento…" : cpfRequired ? "Continuar para o pagamento" : "Assinar agora"}
      </Button> : null}
      {error ? <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
      {supportUrl ? (
        <Button asChild variant="outline" className="h-11 w-full rounded-xl">
          <a href={supportUrl} target="_blank" rel="noreferrer"><MessageCircle aria-hidden /> Falar com o suporte</a>
        </Button>
      ) : null}
    </div>
  );
}
