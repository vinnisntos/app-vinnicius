import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appSettings, faqItems, helpTooltips, posts, subscriptions } from "@/lib/db/schema";
import type { AccessState, AdminSubscriptionItem, SubscriptionStatus, UserRole } from "@/types/database";
import type {
  FaqItemInput,
  HelpTooltipInput,
  ListSubscriptionsQuery,
  ModeratePostInput,
  SubscriptionActionInput,
  UpdateFaqItemInput,
  UpdateSettingsInput,
} from "./schema";

/**
 * Repository do painel master. Chamado SÓ de rotas com guard "master"
 * (src/lib/api/handler.ts) — aqui não há filtro por userId de propósito:
 * o master enxerga todos os assinantes.
 */

type AdminRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  created_at: Date;
  access_state: AccessState;
  status: SubscriptionStatus | null;
  is_active_subscription: boolean | null;
  trial_ends_at: Date | null;
  current_period_end: Date | null;
  cancel_requested_at: Date | null;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  approved_by: string | null;
  approved_at: Date | null;
  revoked_at: Date | null;
  admin_notes: string | null;
  sub_created_at: Date | null;
  sub_updated_at: Date | null;
  total: number;
};

const isoOrNull = (d: Date | null) => (d ? new Date(d).toISOString() : null);

export async function listSubscriptions(
  query: ListSubscriptionsQuery,
): Promise<{ items: AdminSubscriptionItem[]; total: number }> {
  const offset = (query.page - 1) * query.page_size;
  const search = query.q ? `%${query.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%` : null;

  // access_state vem da MESMA função do paywall (lateral join) — o painel
  // nunca mostra um estado diferente do que o assinante vive no app.
  const rows = await db.execute<AdminRow>(sql`
    select p.id, p.full_name, p.email, p.phone, p.role, p.created_at,
           a.access_state,
           s.status, s.is_active_subscription, s.trial_ends_at, s.current_period_end, s.cancel_requested_at,
           s.asaas_customer_id, s.asaas_subscription_id, s.approved_by, s.approved_at,
           s.revoked_at, s.admin_notes,
           s.created_at as sub_created_at, s.updated_at as sub_updated_at,
           count(*) over ()::int as total
    from public.profiles p
    left join public.subscriptions s on s.user_id = p.id
    cross join lateral public.get_access_status(p.id) a
    where (${query.state ?? null}::text is null or a.access_state = ${query.state ?? null})
      and (${search}::text is null
           or p.email ilike ${search} or p.full_name ilike ${search} or p.phone ilike ${search})
    order by p.created_at desc
    limit ${query.page_size} offset ${offset}
  `);

  const items: AdminSubscriptionItem[] = rows.map((r) => ({
    profile: {
      id: r.id,
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
      role: r.role,
      created_at: new Date(r.created_at).toISOString(),
    },
    access_state: r.access_state,
    subscription: r.status
      ? {
          user_id: r.id,
          status: r.status,
          is_active_subscription: Boolean(r.is_active_subscription),
          trial_ends_at: new Date(r.trial_ends_at!).toISOString(),
          current_period_end: isoOrNull(r.current_period_end),
          cancel_requested_at: isoOrNull(r.cancel_requested_at),
          asaas_customer_id: r.asaas_customer_id,
          asaas_subscription_id: r.asaas_subscription_id,
          approved_by: r.approved_by,
          approved_at: isoOrNull(r.approved_at),
          revoked_at: isoOrNull(r.revoked_at),
          admin_notes: r.admin_notes,
          created_at: new Date(r.sub_created_at!).toISOString(),
          updated_at: new Date(r.sub_updated_at!).toISOString(),
        }
      : null,
  }));

  return { items, total: rows[0]?.total ?? 0 };
}

/** Contagem por estado de acesso — cards de resumo do painel. */
export async function getAccessOverview(): Promise<Record<AccessState, number>> {
  const rows = await db.execute<{ access_state: AccessState; n: number }>(sql`
    select a.access_state, count(*)::int as n
    from public.profiles p
    cross join lateral public.get_access_status(p.id) a
    group by a.access_state
  `);
  const base: Record<AccessState, number> = { master: 0, active: 0, trial: 0, expired: 0, revoked: 0 };
  for (const r of rows) base[r.access_state] = r.n;
  return base;
}

/**
 * Aprovar/revogar/estender trial. Upsert: usuário criado antes do 0003 sem
 * linha de subscription também pode ser aprovado.
 */
export async function applySubscriptionAction(
  masterId: string,
  userId: string,
  input: SubscriptionActionInput,
) {
  const now = new Date();
  const notes = input.admin_notes !== undefined ? { adminNotes: input.admin_notes } : {};

  const set = (() => {
    switch (input.action) {
      case "approve":
        return { status: "active", approvedBy: masterId, approvedAt: now, revokedAt: null, ...notes };
      case "revoke":
        return { status: "revoked", revokedAt: now, ...notes };
      case "extend_trial":
        // Conta a partir de agora se o trial já venceu; senão soma ao fim atual.
        return {
          status: "trialing",
          revokedAt: null,
          trialEndsAt: sql`greatest(${subscriptions.trialEndsAt}, now()) + make_interval(days => ${input.days})`,
          ...notes,
        };
      case "set_notes":
        return notes;
    }
  })();

  // No INSERT (usuário sem linha) o trialEndsAt não pode referenciar a
  // própria coluna — só o ramo de UPDATE usa o `greatest(...)`.
  const insertSet: Record<string, unknown> = { ...set };
  delete insertSet.trialEndsAt;

  const [row] = await db
    .insert(subscriptions)
    .values({
      userId,
      trialEndsAt:
        input.action === "extend_trial" ? sql`now() + make_interval(days => ${input.days})` : now,
      ...insertSet,
    })
    .onConflictDoUpdate({ target: subscriptions.userId, set: { ...set, updatedAt: now } })
    .returning();
  return row;
}

export async function getFullSettings() {
  const [row] = await db.select().from(appSettings).limit(1);
  return row;
}

export async function updateSettings(input: UpdateSettingsInput) {
  const [row] = await db
    .update(appSettings)
    .set({
      ...(input.trial_days !== undefined && { trialDays: input.trial_days }),
      ...(input.support_whatsapp !== undefined && { supportWhatsapp: input.support_whatsapp }),
      ...(input.support_whatsapp_message !== undefined && {
        supportWhatsappMessage: input.support_whatsapp_message,
      }),
      ...(input.asaas_checkout_url !== undefined && { asaasCheckoutUrl: input.asaas_checkout_url }),
    })
    .where(eq(appSettings.id, true))
    .returning();
  return row;
}

export async function listAllFaq() {
  return db.select().from(faqItems).orderBy(faqItems.category, faqItems.orderIndex);
}

export async function createFaqItem(input: FaqItemInput) {
  const [row] = await db
    .insert(faqItems)
    .values({
      question: input.question,
      answer: input.answer,
      category: input.category,
      orderIndex: input.order_index,
      isPublished: input.is_published,
    })
    .returning();
  return row;
}

export async function updateFaqItem(id: string, input: UpdateFaqItemInput) {
  const [row] = await db
    .update(faqItems)
    .set({
      ...(input.question !== undefined && { question: input.question }),
      ...(input.answer !== undefined && { answer: input.answer }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.order_index !== undefined && { orderIndex: input.order_index }),
      ...(input.is_published !== undefined && { isPublished: input.is_published }),
    })
    .where(eq(faqItems.id, id))
    .returning();
  return row ?? null;
}

export async function deleteFaqItem(id: string) {
  const rows = await db.delete(faqItems).where(eq(faqItems.id, id)).returning({ id: faqItems.id });
  return rows.length > 0;
}

export async function upsertHelpTooltip(key: string, input: HelpTooltipInput) {
  const values = { title: input.title, body: input.body, faqItemId: input.faq_item_id };
  const [row] = await db
    .insert(helpTooltips)
    .values({ key, ...values })
    .onConflictDoUpdate({ target: helpTooltips.key, set: values })
    .returning();
  return row;
}

export async function moderatePost(id: string, input: ModeratePostInput) {
  const [row] = await db
    .update(posts)
    .set({
      ...(input.is_hidden !== undefined && { isHidden: input.is_hidden }),
      ...(input.hidden_reason !== undefined && { hiddenReason: input.hidden_reason }),
      ...(input.visibility !== undefined && { visibility: input.visibility }),
    })
    .where(eq(posts.id, id))
    .returning();
  return row ?? null;
}
