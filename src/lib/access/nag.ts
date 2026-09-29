import type { AccessStatus } from "@/types/database";

/**
 * Leitura de UI do `AccessStatus` — regra de acesso NÃO mora aqui (é da
 * função SQL get_access_status); isto só traduz flags em comportamento de
 * tela. Puro, sem I/O: roda no server e no client.
 *
 * - none:     sem nag (assinante/master)
 * - soft:     trial vigente — banners e pop-ups de escassez, dispensáveis
 * - blocking: trial expirado/revogado — paywall que não fecha
 */
export type NagMode = "none" | "soft" | "blocking";

export function getNagMode(access: Pick<AccessStatus, "show_nag_screen" | "has_access">): NagMode {
  if (!access.show_nag_screen) return "none";
  return access.has_access ? "soft" : "blocking";
}

export type TrialCountdown = {
  msLeft: number;
  days: number;
  hours: number;
  minutes: number;
  /** Última 24h — o front intensifica a escassez (cor/frequência do pop-up). */
  isLastDay: boolean;
  expired: boolean;
};

/**
 * Tempo restante de trial usando o relógio do SERVIDOR (`server_now`) como
 * referência, corrigido pelo tempo decorrido desde que a resposta chegou
 * (`receivedAtMs`, relógio local só como cronômetro). Assim um aparelho com
 * hora errada não mostra countdown errado.
 */
export function getTrialCountdown(
  access: Pick<AccessStatus, "trial_ends_at" | "server_now">,
  receivedAtMs: number,
  nowMs: number,
): TrialCountdown | null {
  if (!access.trial_ends_at) return null;

  const serverNowMs = Date.parse(access.server_now) + (nowMs - receivedAtMs);
  const msLeft = Math.max(0, Date.parse(access.trial_ends_at) - serverNowMs);

  const totalMinutes = Math.floor(msLeft / 60_000);
  return {
    msLeft,
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
    isLastDay: msLeft > 0 && msLeft <= 86_400_000,
    expired: msLeft === 0,
  };
}

/**
 * Frequência do pop-up de escassez no trial: 1x por sessão nos primeiros
 * dias, a cada navegação no último dia. `lastShownAtMs` vem do storage do
 * cliente.
 */
export function shouldShowNagPopup(
  mode: NagMode,
  countdown: TrialCountdown | null,
  lastShownAtMs: number | null,
  nowMs: number,
): boolean {
  if (mode === "blocking") return true;
  if (mode === "none") return false;
  if (lastShownAtMs == null) return true;

  const interval = countdown?.isLastDay ? 10 * 60_000 : 6 * 3_600_000;
  return nowMs - lastShownAtMs >= interval;
}
