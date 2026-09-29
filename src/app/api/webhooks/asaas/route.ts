import { createHash, timingSafeEqual } from "node:crypto";
import { asaasWebhookSchema } from "@/lib/integrations/asaas/events";
import { processWebhook } from "@/lib/modules/billing/service";

/**
 * Webhook do Asaas (configurar no painel Asaas → Integrações → Webhooks,
 * URL https://<APP_URL>/api/webhooks/asaas, com "Token de autenticação" =
 * ASAAS_WEBHOOK_TOKEN). Sem sessão — autenticado só pelo header
 * `asaas-access-token`.
 *
 * Contrato com o Asaas: 200 assim que o evento está persistido/aplicado;
 * 5xx só para falha transitória (o Asaas reenvia; 15 falhas seguidas pausam
 * a fila). Payload inválido/usuário desconhecido → 200 registrado, não 4xx
 * em loop.
 */
const digest = (value: string) => createHash("sha256").update(value).digest();

function isAuthorized(received: string | null): boolean {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected || !received) return false;
  // Hash antes de comparar: timingSafeEqual exige tamanhos iguais e não pode
  // vazar o tamanho do token esperado.
  return timingSafeEqual(digest(received), digest(expected));
}

export async function POST(request: Request) {
  if (!process.env.ASAAS_WEBHOOK_TOKEN) {
    console.error("[asaas] ASAAS_WEBHOOK_TOKEN não configurado — webhook recusado");
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  if (!isAuthorized(request.headers.get("asaas-access-token"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = asaasWebhookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    console.error("[asaas] payload inválido", parsed.error.issues[0]);
    return Response.json({ received: true, ignored: "invalid_payload" });
  }

  try {
    const outcome = await processWebhook(parsed.data);
    return Response.json({ received: true, ...outcome });
  } catch (error) {
    console.error("[asaas] falha ao processar", parsed.data.id, error);
    return Response.json({ error: "processing_failed" }, { status: 500 });
  }
}
