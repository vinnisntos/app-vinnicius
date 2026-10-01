"use client";

import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { ApiClientError, apiData } from "@/lib/api/client";
import { formatBRL } from "@/lib/format";
import type { BillingPlan, BillingPlanId, CheckoutRequest, CheckoutResponse, PlansResponse, PublicSettings } from "@/types/database";

function messageFor(error: unknown) {
  if (error instanceof ApiClientError) {
    // 409: assinatura já ativa ou vagas do fundador esgotadas — o servidor diz qual.
    if (error.status === 409 || error.code === "conflict") return error.message;
    if (error.status === 403 || error.code === "forbidden") return "Seu acesso foi suspenso pela administração.";
    if (error.status === 404) return "O checkout ainda não está disponível. Fale com o suporte para assinar.";
    if (error.status === 502 || error.code === "upstream") return "O serviço de pagamento está instável. Tente novamente ou fale com o suporte.";
    return error.message;
  }
  return "Sem conexão com o pagamento. Verifique sua internet e tente novamente.";
}

const ORDER: Record<BillingPlanId, number> = { fundador: 0, anual: 1, mensal: 2 };

function planDetail(plan: BillingPlan) {
  if (plan.id === "fundador") return "À vista no Pix · 12 meses · não renova";
  if (plan.id === "anual") return `Por ano · equivale a ${formatBRL(plan.monthly_equivalent)} por mês`;
  return "Por mês · Pix, boleto ou cartão";
}

function actionLabel(plan: BillingPlan) {
  if (plan.id === "fundador") return `Pagar ${formatBRL(plan.price)} no Pix`;
  return `Assinar por ${formatBRL(plan.price)}/${plan.id === "anual" ? "ano" : "mês"}`;
}

const available = (plan: BillingPlan) => plan.seats_left !== 0;

export function CheckoutButton({ revoked = false, plans: initialPlans }: { revoked?: boolean; plans: BillingPlan[] }) {
  const [plans, setPlans] = useState(() => [...initialPlans].sort((a, b) => ORDER[a.id] - ORDER[b.id]));
  const [planId, setPlanId] = useState<BillingPlanId>(() => plans.find(available)?.id ?? "mensal");
  const selected = plans.find((plan) => plan.id === planId) ?? plans[0];
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
      const request: CheckoutRequest = cpfRequired ? { cpf, plan: planId } : { plan: planId };
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
      if (cause instanceof ApiClientError && cause.status === 409) {
        // Vagas podem ter acabado enquanto a tela estava aberta: recarrega.
        try {
          const fresh = (await apiData<PlansResponse>("/api/billing/plans")).plans.sort((a, b) => ORDER[a.id] - ORDER[b.id]);
          setPlans(fresh);
          if (!fresh.some((plan) => plan.id === planId && available(plan))) setPlanId(fresh.find(available)?.id ?? "mensal");
        } catch {
          // mantém a lista atual
        }
      }
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
    <div className="mt-4 space-y-3">
      {!revoked ? <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">Escolha seu plano</legend>
        {plans.map((plan) => <label key={plan.id} className={`flex min-h-16 items-center gap-3 rounded-2xl border border-glass-border bg-glass p-4 transition has-[:checked]:border-brand-strong has-[:checked]:bg-brand-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${available(plan) ? "cursor-pointer" : "opacity-60"}`}>
          <input type="radio" name="plan" value={plan.id} checked={planId === plan.id} disabled={!available(plan)} onChange={() => setPlanId(plan.id)} className="size-5 shrink-0 accent-[var(--brand-600)]" />
          <span className="min-w-0 flex-1"><span className="block font-semibold">{plan.name}</span><span className="block text-xs leading-relaxed text-text-secondary">{planDetail(plan)}</span>{plan.seats_left !== null ? <span className={`block text-xs font-semibold ${available(plan) ? "text-warning" : "text-text-secondary"}`}>{!available(plan) ? "Esgotado" : plan.seats_left === 1 ? "Resta 1 vaga" : `Restam ${plan.seats_left} vagas`}</span> : null}</span>
          <span className="shrink-0 text-lg font-bold">{formatBRL(plan.price)}</span>
        </label>)}
      </fieldset> : null}
      {cpfRequired && !revoked ? <div className="space-y-2"><label htmlFor="checkout-cpf" className="text-sm font-medium">CPF</label><input id="checkout-cpf" inputMode="numeric" autoComplete="off" value={cpf} onChange={(event) => { const digits = event.target.value.replace(/\D/g, "").slice(0, 11); setCpf(digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2")); setCpfErrors([]); }} className="h-12 w-full rounded-xl border border-glass-border bg-glass px-3 outline-none focus-visible:ring-2 focus-visible:ring-brand-500" placeholder="000.000.000-00" aria-invalid={!!cpfErrors.length} />{cpfErrors.map((message) => <p key={message} className="text-xs text-danger">{message}</p>)}<p className="text-xs leading-relaxed text-text-tertiary">O CPF vai direto para o processador de pagamento e não fica salvo no app.</p></div> : null}
      {!revoked ? <BottomActionBar className="md:w-full"><Button data-primary-action="subscribe" type="button" onClick={checkout} disabled={pending} className="h-12 w-full rounded-xl bg-success-500 text-base font-bold text-on-bright hover:bg-success-500/85">
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <ArrowRight aria-hidden />}
        {pending ? "Abrindo pagamento…" : actionLabel(selected)}
      </Button></BottomActionBar> : null}
      {error ? <p role="alert" className="rounded-xl border border-danger bg-danger-soft p-3 text-sm text-danger">{error}</p> : null}
      {supportUrl ? (
        <Button asChild variant="outline" className="h-11 w-full rounded-xl">
          <a href={supportUrl} target="_blank" rel="noreferrer"><MessageCircle aria-hidden /> Falar com o suporte</a>
        </Button>
      ) : null}
    </div>
  );
}
