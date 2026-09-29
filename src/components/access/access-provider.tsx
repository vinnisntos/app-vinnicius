"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getNagMode, getTrialCountdown, type NagMode, type TrialCountdown } from "@/lib/access/nag";
import { apiData, onAccessChange } from "@/lib/api/client";
import type { AccessStatus, UserRole } from "@/types/database";

/**
 * Estado de acesso compartilhado com toda a árvore do app. Só lógica — sem
 * markup. Os componentes de nag/paywall (UI) leem `useAccess()`.
 *
 * - Semente vem do server (layout) → sem flash de conteúdo liberado.
 * - Qualquer `apiFetch` que receba `access` atualiza o estado; um 402
 *   força refresh (o paywall abre na hora).
 * - Countdown re-renderiza a cada 30s usando o relógio do servidor.
 */
type AccessContextValue = {
  access: AccessStatus;
  role: UserRole;
  nagMode: NagMode;
  countdown: TrialCountdown | null;
  refresh: () => Promise<void>;
};

const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({
  initialAccess,
  role,
  children,
}: {
  initialAccess: AccessStatus;
  role: UserRole;
  children: ReactNode;
}) {
  const [state, setState] = useState(() => ({ access: initialAccess, receivedAt: Date.now() }));
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    const access = await apiData<AccessStatus>("/api/access");
    setState({ access, receivedAt: Date.now() });
  }, []);

  useEffect(
    () =>
      onAccessChange((access, reason) => {
        if (access) setState({ access, receivedAt: Date.now() });
        else if (reason === "paywall") void refresh().catch(() => undefined);
      }),
    [refresh],
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const value = useMemo<AccessContextValue>(
    () => ({
      access: state.access,
      role,
      nagMode: getNagMode(state.access),
      countdown: state.access.is_trial
        ? getTrialCountdown(state.access, state.receivedAt, now)
        : null,
      refresh,
    }),
    [state, role, now, refresh],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess(): AccessContextValue {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess() fora de <AccessProvider>");
  return ctx;
}
