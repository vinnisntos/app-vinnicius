"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { onMutationResult } from "@/lib/api/client";
import {
  FEEDBACK_EVENT,
  kindForMutation,
  playSound,
  vibrate,
  type FeedbackKind,
} from "@/lib/feedback/sounds";

/**
 * Preferências do usuário que afetam a experiência (som e vibração).
 * Semeado pelo layout a partir do perfil; Minha conta atualiza na hora.
 * Toca feedback para toda escrita da API e para metas emitidas pelas telas.
 */
type Preferences = { soundEnabled: boolean; hapticsEnabled: boolean };

type PreferencesContextValue = Preferences & {
  setPreferences: (next: Partial<Preferences>) => void;
  feedback: (kind: FeedbackKind) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ initial, children }: { initial: Preferences; children: ReactNode }) {
  const [prefs, setPrefs] = useState(initial);
  const prefsRef = useRef(prefs);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const feedback = useCallback((kind: FeedbackKind) => {
    const current = prefsRef.current;
    if (current.soundEnabled) playSound(kind);
    if (current.hapticsEnabled) vibrate(kind);
  }, []);

  useEffect(() => {
    const offMutation = onMutationResult(({ ok, path }) => {
      // Preferências em si não soam (o toggle já dá retorno visual).
      if (path === "/api/me") return;
      feedback(kindForMutation(path, ok));
    });
    const onGoal = (event: Event) => feedback((event as CustomEvent<FeedbackKind>).detail);
    window.addEventListener(FEEDBACK_EVENT, onGoal);
    return () => {
      offMutation();
      window.removeEventListener(FEEDBACK_EVENT, onGoal);
    };
  }, [feedback]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      ...prefs,
      setPreferences: (next) => setPrefs((current) => ({ ...current, ...next })),
      feedback,
    }),
    [prefs, feedback],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences() fora de <PreferencesProvider>");
  return ctx;
}
