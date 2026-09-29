-- 0004_integrations_and_nag.sql
-- 1. show_nag_screen passa a valer também para trial expirado/revogado.
--    O front distingue pelo has_access:
--      show_nag_screen && has_access   → nag dispensável (escassez no trial)
--      show_nag_screen && !has_access  → paywall bloqueante
-- 2. Tabelas das integrações de custo zero: webhook Asaas (idempotência e
--    auditoria) e Google Calendar (tokens OAuth + lembretes recorrentes).

-- =========================================================================
-- 1. get_access_status — mesma assinatura do 0003, nova regra de nag
-- =========================================================================

create or replace function public.get_access_status(p_user_id uuid)
returns table (
  access_state text,
  has_access boolean,
  is_trial boolean,
  show_nag_screen boolean,
  is_active_subscription boolean,
  trial_ends_at timestamptz,
  server_now timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_sub public.subscriptions%rowtype;
  v_state text;
begin
  if (select auth.role()) = 'authenticated'
     and p_user_id is distinct from (select auth.uid())
     and not public.is_master() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where id = p_user_id;
  select * into v_sub from public.subscriptions where user_id = p_user_id;

  v_state := case
    when v_role = 'master' then 'master'
    when v_sub.user_id is null then 'expired'
    when v_sub.status = 'revoked' then 'revoked'
    when v_sub.is_active_subscription then 'active'
    when v_sub.status = 'trialing' and now() < v_sub.trial_ends_at then 'trial'
    else 'expired'
  end;

  return query select
    v_state,
    v_state in ('master', 'active', 'trial'),
    v_state = 'trial',
    v_state not in ('master', 'active'),
    coalesce(v_sub.is_active_subscription, false),
    v_sub.trial_ends_at,
    now();
end;
$$;

-- =========================================================================
-- 2. Asaas — log idempotente de webhooks
-- =========================================================================

-- PK = id do evento enviado pelo Asaas ("evt_..."): reentregas do mesmo
-- evento viram no-op (insert ... on conflict do nothing).
create table public.asaas_webhook_events (
  id text primary key,
  event text not null,
  payment_id text,
  asaas_subscription_id text,
  user_id uuid references auth.users (id) on delete set null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

create index asaas_webhook_events_user_id_idx on public.asaas_webhook_events (user_id);

alter table public.asaas_webhook_events enable row level security;
create policy master_select on public.asaas_webhook_events
  for select using ((select public.is_master()));

-- =========================================================================
-- 3. Google Calendar
-- =========================================================================

-- Refresh token cifrado na aplicação (AES-256-GCM, chave em
-- GOOGLE_TOKEN_ENCRYPTION_KEY). RLS ligada SEM policy para anon/authenticated:
-- token nunca sai pelo PostgREST, só pela via server-side (Drizzle).
create table public.google_calendar_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  google_email text,
  refresh_token_encrypted text not null,
  scope text not null,
  calendar_id text not null default 'primary',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;

create trigger set_updated_at before update on public.google_calendar_connections
  for each row execute function public.set_updated_at();

-- Um evento recorrente (RRULE) por tipo de lembrete: uma chamada à API do
-- Google cria o lembrete para sempre — sem cron nem servidor de push.
create table public.calendar_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('treino', 'refeicoes', 'agua', 'pesagem')),
  title text not null check (char_length(title) between 1 and 120),
  -- 0 = domingo … 6 = sábado
  days_of_week smallint[] not null check (
    cardinality(days_of_week) between 1 and 7
    and days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  local_time time not null,
  duration_minutes smallint not null default 30 check (duration_minutes between 5 and 240),
  timezone text not null default 'America/Sao_Paulo',
  google_event_id text,
  is_active boolean not null default true,
  synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind)
);

create trigger set_updated_at before update on public.calendar_reminders
  for each row execute function public.set_updated_at();

alter table public.calendar_reminders enable row level security;
create policy owner_full_access on public.calendar_reminders
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy master_full_access on public.calendar_reminders
  for all using ((select public.is_master())) with check ((select public.is_master()));

insert into public.help_tooltips (key, title, body) values
  ('calendar_reminders.kind', 'Lembretes na agenda',
   'Criamos um evento recorrente no seu Google Agenda com alerta no celular — sem instalar nada.'),
  ('route.assinar', 'Assinatura',
   'Pagamento processado pelo Asaas (Pix, boleto ou cartão). O acesso é liberado assim que o pagamento é confirmado.')
on conflict (key) do nothing;
