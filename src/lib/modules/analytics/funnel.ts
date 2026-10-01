import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { getAppSettings } from "@/lib/modules/conta/repository";
import { countFounders } from "@/lib/modules/billing/repository";
import type { BillingPlanId, CancelReason, FunnelResponse } from "@/types/database";

export const funnelQuery = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) });

/**
 * Funil cadastro → ativação → pagamento da coorte que se cadastrou nos
 * últimos N dias (master fora da conta). Só agregados — nenhuma linha
 * individual nem dado de saúde sai daqui.
 */
export async function getFunnel(days: number): Promise<FunnelResponse> {
  const since = sql`now() - make_interval(days => ${days})`;
  const cohort = sql`
    select p.id, p.medication_status, coalesce(p.signup_utm ->> 'utm_source', 'direto') as source,
           s.status, s.plan, s.trial_ends_at, s.cancel_requested_at, s.cancel_reason,
           (exists (select 1 from public.meal_logs m where m.user_id = p.id and m.is_completed)
            or exists (select 1 from public.medication_logs l where l.user_id = p.id)) as activated,
           (p.medication_status = 'usa'
            or exists (select 1 from public.medications md where md.user_id = p.id)) as with_medication
    from public.profiles p
    left join public.subscriptions s on s.user_id = p.id
    where p.role <> 'master' and p.created_at >= ${since}
  `;

  const [totals] = await db.execute<{
    signups: number;
    activated: number;
    with_medication: number;
    trials_running: number;
    trials_ended: number;
    subscribed: number;
    canceled: number;
  }>(sql`
    select count(*)::int as signups,
           count(*) filter (where activated)::int as activated,
           count(*) filter (where with_medication)::int as with_medication,
           count(*) filter (where status = 'trialing' and trial_ends_at > now())::int as trials_running,
           count(*) filter (where status = 'trialing' and trial_ends_at <= now())::int as trials_ended,
           count(*) filter (where status = 'active')::int as subscribed,
           count(*) filter (where cancel_requested_at is not null or status = 'canceled')::int as canceled
    from (${cohort}) c
  `);

  const byPlan = await db.execute<{ plan: BillingPlanId; n: number }>(sql`
    select plan, count(*)::int as n from (${cohort}) c
    where status = 'active' and plan is not null group by plan
  `);
  const bySource = await db.execute<{ source: string; signups: number; subscribed: number }>(sql`
    select source, count(*)::int as signups, count(*) filter (where status = 'active')::int as subscribed
    from (${cohort}) c group by source order by signups desc limit 20
  `);
  const reasons = await db.execute<{ reason: CancelReason; n: number }>(sql`
    select cancel_reason as reason, count(*)::int as n from (${cohort}) c
    where cancel_reason is not null group by cancel_reason
  `);

  const [settings, sold] = await Promise.all([getAppSettings(), countFounders()]);
  const total = settings?.founderSeatsTotal ?? 0;
  const base = totals.subscribed + totals.trials_ended;

  return {
    days,
    ...totals,
    trial_conversion_pct: base > 0 ? Math.round((totals.subscribed / base) * 1000) / 10 : null,
    by_plan: Object.fromEntries(byPlan.map((r) => [r.plan, r.n])),
    by_source: bySource.map((r) => ({ source: r.source, signups: r.signups, subscribed: r.subscribed })),
    cancel_reasons: Object.fromEntries(reasons.map((r) => [r.reason, r.n])),
    founder: { total, sold, left: Math.max(0, total - sold) },
  };
}
