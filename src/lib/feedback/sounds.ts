/**
 * Feedback sonoro e tátil — sons SINTETIZADOS com Web Audio (sem arquivos:
 * nada a baixar e compatível com a CSP). Curtos e em volume baixo.
 *
 * - success: registro salvo (duas notas ascendentes)
 * - goal:    meta batida (acorde curto em arpejo)
 * - error:   falha ao salvar (nota grave descendente)
 */
export type FeedbackKind = "success" | "goal" | "error";

type Note = { freq: number; start: number; duration: number; type?: OscillatorType };

const PATTERNS: Record<FeedbackKind, Note[]> = {
  success: [
    { freq: 660, start: 0, duration: 0.08 },
    { freq: 880, start: 0.07, duration: 0.11 },
  ],
  goal: [
    { freq: 523.25, start: 0, duration: 0.09 },
    { freq: 659.25, start: 0.07, duration: 0.09 },
    { freq: 783.99, start: 0.14, duration: 0.14 },
  ],
  error: [
    { freq: 330, start: 0, duration: 0.1, type: "triangle" },
    { freq: 247, start: 0.09, duration: 0.14, type: "triangle" },
  ],
};

/** Padrões de vibração (ms): Android. iPhone não expõe a API — ignorado. */
const VIBRATION: Record<FeedbackKind, number[]> = {
  success: [18],
  goal: [20, 60, 20, 60, 40],
  error: [60, 40, 60],
};

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  return context;
}

export function playSound(kind: FeedbackKind, volume = 0.06) {
  if (typeof document !== "undefined" && document.hidden) return;
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  const now = ctx.currentTime;
  for (const note of PATTERNS[kind]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.type ?? "sine";
    osc.frequency.value = note.freq;
    // Envelope curto (ataque/decaimento) — evita estalos.
    gain.gain.setValueAtTime(0, now + note.start);
    gain.gain.linearRampToValueAtTime(volume, now + note.start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + note.start);
    osc.stop(now + note.start + note.duration + 0.02);
  }
}

export function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function vibrate(kind: FeedbackKind) {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(VIBRATION[kind]);
  } catch {
    // Alguns navegadores bloqueiam sem interação recente — silencioso.
  }
}

/** Rotas cujo sucesso é "meta batida", não só "registro salvo". */
export function kindForMutation(path: string, ok: boolean): FeedbackKind {
  if (!ok) return "error";
  if (path.startsWith("/api/training/logs")) return "goal";
  return "success";
}

/** Evento para metas detectadas na tela (ex.: água do dia batida). */
export const FEEDBACK_EVENT = "lifeos:feedback";

export function emitFeedback(kind: FeedbackKind) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<FeedbackKind>(FEEDBACK_EVENT, { detail: kind }));
}
