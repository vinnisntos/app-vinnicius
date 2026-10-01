import { APP_CONFIG } from "@/lib/app-config";

/**
 * Cliente mínimo da API v3 do Asaas (fetch puro, sem SDK).
 *
 * Env:
 * - ASAAS_API_KEY        chave da conta (sandbox ou produção)
 * - ASAAS_BASE_URL       default sandbox: https://api-sandbox.asaas.com/v3
 *                        produção:        https://api.asaas.com/v3
 * - ASAAS_PLAN_VALUE     valor da mensalidade em reais (ex. "29.90")
 * - ASAAS_PLAN_DESCRIPTION (opcional)
 *
 * Custo zero de infra: o Asaas cobra só taxa por transação, sem mensalidade.
 */

const DEFAULT_BASE_URL = "https://api-sandbox.asaas.com/v3";

export type AsaasBillingType = "UNDEFINED" | "BOLETO" | "CREDIT_CARD" | "PIX";

export interface AsaasCustomer {
  id: string;
  name: string;
  externalReference: string | null;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  status: "ACTIVE" | "EXPIRED" | "INACTIVE";
  nextDueDate: string;
  externalReference: string | null;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  subscription?: string | null;
  status: string; // PENDING | RECEIVED | CONFIRMED | OVERDUE | REFUNDED | ...
  dueDate: string; // YYYY-MM-DD
  value: number;
  invoiceUrl: string;
  externalReference?: string | null;
}

export class AsaasError extends Error {
  constructor(
    public status: number,
    public errors: { code?: string; description?: string }[],
  ) {
    super(errors[0]?.description ?? `Asaas HTTP ${status}`);
  }
}

export function getAsaasPlan() {
  const value = Number(process.env.ASAAS_PLAN_VALUE);
  return {
    value,
    cycle: "MONTHLY" as const,
    description: process.env.ASAAS_PLAN_DESCRIPTION || `${APP_CONFIG.name} — assinatura mensal`,
  };
}

/**
 * Integração ligada = há chave e a cobrança foi habilitada
 * (ASAAS_PLAN_VALUE > 0 funciona como chave liga/desliga; os preços em si
 * vêm do catálogo em lib/modules/billing/plans.ts).
 */
export function isAsaasConfigured(): boolean {
  const { value } = getAsaasPlan();
  return Boolean(process.env.ASAAS_API_KEY) && Number.isFinite(value) && value > 0;
}

async function request<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  const base = (process.env.ASAAS_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      access_token: process.env.ASAAS_API_KEY ?? "",
      "Content-Type": "application/json",
      // Obrigatório em contas Asaas novas.
      "User-Agent": `${APP_CONFIG.name.replace(/\s+/g, "")}/1.0`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    errors?: { code?: string; description?: string }[];
  };
  if (!response.ok) throw new AsaasError(response.status, payload.errors ?? []);
  return payload;
}

export const asaas = {
  createCustomer(input: {
    name: string;
    cpfCnpj: string;
    email?: string | null;
    mobilePhone?: string | null;
    externalReference: string;
  }) {
    return request<AsaasCustomer>("POST", "/customers", input);
  },

  createSubscription(input: {
    customer: string;
    billingType: AsaasBillingType;
    value: number;
    nextDueDate: string;
    cycle: "MONTHLY" | "YEARLY";
    description: string;
    externalReference: string;
  }) {
    return request<AsaasSubscription>("POST", "/subscriptions", input);
  },

  /** Cobrança avulsa (plano fundador: pagamento único no Pix). */
  createPayment(input: {
    customer: string;
    billingType: AsaasBillingType;
    value: number;
    dueDate: string;
    description: string;
    externalReference: string;
  }) {
    return request<AsaasPayment>("POST", "/payments", input);
  },

  getPayment(paymentId: string) {
    return request<AsaasPayment>("GET", `/payments/${encodeURIComponent(paymentId)}`);
  },

  /** Remove a assinatura no Asaas (para as cobranças futuras). */
  cancelSubscription(subscriptionId: string) {
    return request<{ deleted: boolean; id: string }>(
      "DELETE",
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    );
  },

  async listSubscriptionPayments(subscriptionId: string) {
    const page = await request<{ data: AsaasPayment[] }>(
      "GET",
      `/subscriptions/${encodeURIComponent(subscriptionId)}/payments`,
    );
    return page.data;
  },
};
