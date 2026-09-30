import type { AccessStatus, ApiEnvelope, ApiError, ApiErrorCode } from "@/types/database";

/**
 * Fetch tipado para `/api/*` no cliente. Desembrulha o `ApiEnvelope`,
 * transforma `{ error }` em `ApiClientError` e avisa quem estiver ouvindo
 * sobre o `access` mais recente (o AccessProvider usa isso para abrir o
 * paywall assim que qualquer rota responder 402, sem esperar reload).
 */
export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

type AccessListener = (access: AccessStatus | null, reason: "response" | "paywall") => void;
const accessListeners = new Set<AccessListener>();

export function onAccessChange(listener: AccessListener) {
  accessListeners.add(listener);
  return () => void accessListeners.delete(listener);
}

/**
 * Resultado de escritas (POST/PUT/PATCH/DELETE) — usado pelo feedback de
 * som/vibração sem acoplar cada tela a ele.
 */
type MutationListener = (result: { ok: boolean; method: string; path: string }) => void;
const mutationListeners = new Set<MutationListener>();

export function onMutationResult(listener: MutationListener) {
  mutationListeners.add(listener);
  return () => void mutationListeners.delete(listener);
}

export type ApiFetchInit = Omit<RequestInit, "body"> & { json?: unknown };

export async function apiFetch<T>(path: `/api/${string}`, init: ApiFetchInit = {}): Promise<ApiEnvelope<T>> {
  const { json, headers, ...rest } = init;
  const response = await fetch(path, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(json !== undefined && { "Content-Type": "application/json" }),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
    credentials: "same-origin",
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | ApiError | null;

  if (!response.ok || !payload || "error" in payload) {
    const error = payload && "error" in payload ? payload.error : null;
    if (response.status === 402) accessListeners.forEach((l) => l(null, "paywall"));
    notifyMutation(init.method, path, false);
    throw new ApiClientError(
      response.status,
      error?.code ?? "internal",
      error?.message ?? "Falha de conexão. Tente novamente.",
      error?.fields,
    );
  }

  if (payload.access) accessListeners.forEach((l) => l(payload.access, "response"));
  notifyMutation(init.method, path, true);
  return payload;
}

/** Atalho quando só o `data` interessa. */
export async function apiData<T>(path: `/api/${string}`, init?: ApiFetchInit): Promise<T> {
  return (await apiFetch<T>(path, init)).data;
}

/** UUID v4 gerado no cliente — chave de idempotência dos writes otimistas. */
export const newClientId = () => crypto.randomUUID();

function notifyMutation(method: string | undefined, path: string, ok: boolean) {
  const m = (method ?? "GET").toUpperCase();
  if (m === "GET" || m === "HEAD") return;
  mutationListeners.forEach((l) => l({ ok, method: m, path }));
}
