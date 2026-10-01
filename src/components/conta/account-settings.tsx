"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, Palette, ShieldAlert, UserRound, Wallet } from "lucide-react";
import { useAccess } from "@/components/access/access-provider";
import { usePreferences } from "@/components/preferences/preferences-provider";
import { ThemeSelector } from "@/components/theme/theme-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ApiClientError, apiData } from "@/lib/api/client";
import { canVibrate } from "@/lib/feedback/sounds";
import type { AccessState, CancelSubscriptionResponse, MeResponse, ProfileRow } from "@/types/database";

const STATE_LABEL: Record<AccessState, string> = {
  master: "Administrador",
  active: "Assinatura ativa",
  trial: "Período de teste",
  expired: "Sem acesso (teste encerrado ou assinatura vencida)",
  revoked: "Acesso suspenso",
};

const TIMEZONES = [
  ["America/Sao_Paulo", "Brasília (SP, RJ, MG, Sul, NE…)"],
  ["America/Manaus", "Manaus (AM)"],
  ["America/Cuiaba", "Cuiabá (MT, MS)"],
  ["America/Belem", "Belém (PA, AP)"],
  ["America/Fortaleza", "Fortaleza (CE, RN, PB…)"],
  ["America/Recife", "Recife (PE)"],
  ["America/Porto_Velho", "Porto Velho (RO)"],
  ["America/Rio_Branco", "Rio Branco (AC)"],
  ["America/Noronha", "Fernando de Noronha"],
] as const;

const formatDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(iso)) : null;

/** (11) 99999-8888 — só visual; o servidor guarda só dígitos. */
function maskPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 13);
  const local = d.length > 11 ? d.slice(d.length - 11) : d;
  if (local.length <= 2) return local;
  if (local.length <= 7) return `(${local.slice(0, 2)}) ${local.slice(2)}`;
  return `(${local.slice(0, 2)}) ${local.slice(2, local.length - 4)}-${local.slice(-4)}`;
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-glass-border bg-glass p-5 shadow-xl backdrop-blur-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-brand-500" aria-hidden>{icon}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function FieldErrors({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="mt-1 text-sm text-danger">{errors[0]}</p> : null;
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-sm text-text-secondary">{description}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-success-500" : "bg-surface-muted"}`}>
        <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

export function AccountSettings() {
  const router = useRouter();
  const { access, role, refresh } = useAccess();
  const { soundEnabled, hapticsEnabled, setPreferences, feedback } = usePreferences();
  const [me, setMe] = useState<MeResponse>();
  const [loadError, setLoadError] = useState<string>();

  // Dados
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [dataState, setDataState] = useState<{ pending?: boolean; message?: string; fields?: Record<string, string[]> }>({});

  // Senha
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwState, setPwState] = useState<{ pending?: boolean; message?: string; fields?: Record<string, string[]> }>({});

  // Assinatura / exclusão
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelState, setCancelState] = useState<{ pending?: boolean; error?: string }>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [del, setDel] = useState({ confirm: "", password: "" });
  const [delState, setDelState] = useState<{ pending?: boolean; error?: string; fields?: Record<string, string[]> }>({});

  useEffect(() => {
    apiData<MeResponse>("/api/me")
      .then((data) => {
        setMe(data);
        setName(data.profile.full_name ?? "");
        setPhone(maskPhone(data.profile.phone ?? ""));
        setTimezone(data.profile.timezone);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Não foi possível carregar sua conta."));
  }, []);

  async function saveData() {
    setDataState({ pending: true });
    try {
      const profile = await apiData<ProfileRow>("/api/me", {
        method: "PATCH",
        json: { full_name: name, phone: phone.trim() ? phone : null, timezone },
      });
      setMe((current) => (current ? { ...current, profile } : current));
      setDataState({ message: "Dados salvos." });
    } catch (error) {
      setDataState({ fields: error instanceof ApiClientError ? error.fields : undefined, message: error instanceof Error ? error.message : "Erro ao salvar." });
    }
  }

  async function savePreference(patch: { sound_enabled?: boolean; haptics_enabled?: boolean }) {
    setPreferences({
      ...(patch.sound_enabled !== undefined && { soundEnabled: patch.sound_enabled }),
      ...(patch.haptics_enabled !== undefined && { hapticsEnabled: patch.haptics_enabled }),
    });
    try {
      await apiData<ProfileRow>("/api/me", { method: "PATCH", json: patch });
      if (patch.sound_enabled || patch.haptics_enabled) feedback("success");
    } catch {
      // Reverte se não salvou.
      setPreferences({
        ...(patch.sound_enabled !== undefined && { soundEnabled: !patch.sound_enabled }),
        ...(patch.haptics_enabled !== undefined && { hapticsEnabled: !patch.haptics_enabled }),
      });
    }
  }

  async function changePassword() {
    if (pw.next !== pw.confirm) {
      setPwState({ fields: { confirm: ["As senhas não conferem."] } });
      return;
    }
    setPwState({ pending: true });
    try {
      await apiData("/api/me/password", { method: "POST", json: { current_password: pw.current, new_password: pw.next } });
      setPw({ current: "", next: "", confirm: "" });
      setPwState({ message: "Senha alterada." });
    } catch (error) {
      setPwState({ fields: error instanceof ApiClientError ? error.fields : undefined, message: error instanceof Error ? error.message : "Erro ao trocar a senha." });
    }
  }

  async function cancelSubscription() {
    setCancelState({ pending: true });
    try {
      const result = await apiData<CancelSubscriptionResponse>("/api/billing/cancel", { method: "POST" });
      setMe((current) =>
        current?.subscription ? { ...current, subscription: { ...current.subscription, cancel_requested_at: result.cancel_requested_at } } : current,
      );
      setCancelOpen(false);
      setCancelState({});
      await refresh().catch(() => undefined);
    } catch (error) {
      setCancelState({ error: error instanceof Error ? error.message : "Não foi possível cancelar." });
    }
  }

  async function deleteAccount() {
    setDelState({ pending: true });
    try {
      await apiData("/api/me", { method: "DELETE", json: { confirm: del.confirm, password: del.password } });
      router.replace("/");
      router.refresh();
    } catch (error) {
      setDelState({ fields: error instanceof ApiClientError ? error.fields : undefined, error: error instanceof Error ? error.message : "Não foi possível excluir." });
    }
  }

  if (loadError) return <p role="alert" className="rounded-2xl border border-glass-border bg-danger-soft p-5 text-danger">{loadError}</p>;
  if (!me) {
    return (
      <div className="flex min-h-40 items-center justify-center text-text-secondary" aria-label="Carregando sua conta">
        <LoaderCircle className="animate-spin" aria-hidden />
      </div>
    );
  }

  const sub = me.subscription;
  const canCancel = access.access_state === "active" && !sub?.cancel_requested_at;
  const isMaster = role === "master";

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      <header>
        <h1 className="text-3xl font-black tracking-tight">Minha conta</h1>
        <p className="mt-1 text-sm text-text-secondary">{me.profile.email}</p>
      </header>

      <Section icon={<UserRound className="size-5" />} title="Seus dados">
        <div className="space-y-4">
          <div>
            <Label htmlFor="conta-nome">Nome</Label>
            <Input id="conta-nome" className="mt-1.5 h-12" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <FieldErrors errors={dataState.fields?.full_name} />
          </div>
          <div>
            <Label htmlFor="conta-celular">Celular (opcional)</Label>
            <Input id="conta-celular" className="mt-1.5 h-12" inputMode="tel" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(11) 99999-8888" autoComplete="tel" />
            <FieldErrors errors={dataState.fields?.phone} />
          </div>
          <div>
            <Label htmlFor="conta-fuso">Fuso horário</Label>
            <select
              id="conta-fuso"
              className="mt-1.5 h-12 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {TIMEZONES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {dataState.message ? <p role="status" className="text-sm text-text-secondary">{dataState.message}</p> : null}
          <Button className="h-12 w-full bg-success-500 font-semibold text-on-bright hover:bg-success-500/85" disabled={dataState.pending} onClick={() => void saveData()}>
            {dataState.pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null} Salvar dados
          </Button>
        </div>
      </Section>

      <Section icon={<Palette className="size-5" />} title="Preferências">
        <div className="space-y-2">
          <p className="text-sm font-medium">Tema</p>
          <ThemeSelector />
          <div className="pt-2">
            <Toggle checked={soundEnabled} onChange={(v) => void savePreference({ sound_enabled: v })} label="Sons de confirmação" description="Um som curto ao registrar e ao bater metas." />
            {canVibrate() ? (
              <Toggle checked={hapticsEnabled} onChange={(v) => void savePreference({ haptics_enabled: v })} label="Vibração" description="Vibra ao registrar e ao bater metas." />
            ) : (
              <p className="px-1 py-2 text-sm text-text-secondary">Vibração não disponível neste aparelho (o iPhone não permite pelo navegador).</p>
            )}
          </div>
        </div>
      </Section>

      <Section icon={<KeyRound className="size-5" />} title="Segurança">
        <div className="space-y-4">
          {([
            ["current", "Senha atual", "current-password", pwState.fields?.current_password],
            ["next", "Nova senha (mínimo 8 caracteres)", "new-password", pwState.fields?.new_password],
            ["confirm", "Repita a nova senha", "new-password", pwState.fields?.confirm],
          ] as const).map(([key, label, autoComplete, errors]) => (
            <div key={key}>
              <Label htmlFor={`senha-${key}`}>{label}</Label>
              <PasswordInput id={`senha-${key}`} className="mt-1.5 h-12" autoComplete={autoComplete} value={pw[key]} onChange={(e) => setPw((c) => ({ ...c, [key]: e.target.value }))} />
              <FieldErrors errors={errors} />
            </div>
          ))}
          {pwState.message ? <p role="status" className="text-sm text-text-secondary">{pwState.message}</p> : null}
          <Button variant="secondary" className="h-12 w-full" disabled={pwState.pending || !pw.current || !pw.next} onClick={() => void changePassword()}>
            {pwState.pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null} Trocar senha
          </Button>
        </div>
      </Section>

      {!isMaster ? (
        <Section icon={<Wallet className="size-5" />} title="Assinatura">
          <p className="font-medium">{STATE_LABEL[access.access_state]}</p>
          {access.access_state === "trial" && access.trial_ends_at ? (
            <p className="mt-1 text-sm text-text-secondary">Teste grátis até {formatDate(access.trial_ends_at)}.</p>
          ) : null}
          {sub?.cancel_requested_at ? (
            <p className="mt-2 rounded-xl bg-warning-soft p-3 text-sm text-warning">
              Assinatura cancelada — seu acesso continua {sub.current_period_end ? `até ${formatDate(sub.current_period_end)}` : "até o fim do período atual"}. Nenhuma nova cobrança será feita.
            </p>
          ) : sub?.current_period_end && access.access_state === "active" ? (
            <p className="mt-1 text-sm text-text-secondary">Próxima renovação em {formatDate(sub.current_period_end)}.</p>
          ) : null}
          <div className="mt-4 grid gap-2">
            {access.access_state !== "active" ? (
              <Button className="h-12 w-full bg-success-500 font-semibold text-on-bright hover:bg-success-500/85" onClick={() => router.push("/assinar")}>
                Ver assinatura
              </Button>
            ) : null}
            {canCancel ? (
              <Button variant="ghost" className="h-12 w-full text-text-secondary" onClick={() => setCancelOpen(true)}>
                Cancelar assinatura
              </Button>
            ) : null}
          </div>
        </Section>
      ) : null}

      <section className="rounded-2xl border border-danger/40 bg-danger-soft p-5">
        <div className="mb-2 flex items-center gap-2 text-danger">
          <ShieldAlert className="size-5" aria-hidden />
          <h2 className="font-semibold">Excluir conta</h2>
        </div>
        {isMaster ? (
          <p className="text-sm">A conta de administrador não pode ser excluída por aqui, para o produto não ficar sem responsável.</p>
        ) : (
          <>
            <p className="text-sm">Apaga definitivamente sua conta e todos os seus registros, cancela a assinatura e desconecta o Google Agenda. Não é possível desfazer.</p>
            <Button variant="destructive" className="mt-4 h-12 w-full" onClick={() => setDeleteOpen(true)}>
              Excluir minha conta
            </Button>
          </>
        )}
      </section>

      <Sheet open={cancelOpen} onOpenChange={setCancelOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="px-0">
            <SheetTitle>Cancelar assinatura?</SheetTitle>
            <SheetDescription>
              As cobranças param agora. Você continua com acesso {sub?.current_period_end ? `até ${formatDate(sub.current_period_end)}` : "até o fim do período já pago"}.
            </SheetDescription>
          </SheetHeader>
          {cancelState.error ? <p role="alert" className="text-sm text-danger">{cancelState.error}</p> : null}
          <SheetFooter className="grid gap-2 px-0">
            <Button variant="destructive" className="h-12" disabled={cancelState.pending} onClick={() => void cancelSubscription()}>
              {cancelState.pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null} Confirmar cancelamento
            </Button>
            <Button variant="ghost" className="h-12" onClick={() => setCancelOpen(false)}>Manter assinatura</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) { setDel({ confirm: "", password: "" }); setDelState({}); } }}>
        <SheetContent side="bottom" className="rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="px-0">
            <SheetTitle>Excluir conta definitivamente</SheetTitle>
            <SheetDescription>Todos os seus dados serão apagados. Para confirmar, digite EXCLUIR e sua senha.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="excluir-confirmacao">Digite EXCLUIR</Label>
              <Input id="excluir-confirmacao" className="mt-1.5 h-12" autoComplete="off" value={del.confirm} onChange={(e) => setDel((c) => ({ ...c, confirm: e.target.value }))} />
              <FieldErrors errors={delState.fields?.confirm} />
            </div>
            <div>
              <Label htmlFor="excluir-senha">Sua senha</Label>
              <PasswordInput id="excluir-senha" className="mt-1.5 h-12" autoComplete="current-password" value={del.password} onChange={(e) => setDel((c) => ({ ...c, password: e.target.value }))} />
              <FieldErrors errors={delState.fields?.password} />
            </div>
            {delState.error && !delState.fields ? <p role="alert" className="text-sm text-danger">{delState.error}</p> : null}
          </div>
          <SheetFooter className="grid gap-2 px-0">
            <Button
              variant="destructive"
              className="h-12"
              data-danger-action="delete-account"
              disabled={delState.pending || del.confirm !== "EXCLUIR" || !del.password}
              onClick={() => void deleteAccount()}
            >
              {delState.pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null} Excluir para sempre
            </Button>
            <Button variant="ghost" className="h-12" onClick={() => setDeleteOpen(false)}>Voltar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
