-- 0013_fase0_reposicionamento.sql
-- Roadmap de produto, Fase 0 ("Reposicionar e cobrar"):
--   1. Perfil: uso de medicação (sim/não/vou começar), consentimento LGPD
--      específico para dados de saúde e origem do cadastro (UTM)
--   2. Planos: mensal, anual e fundador (Pix à vista, vagas limitadas, sem
--      renovação) + motivo de cancelamento
--   3. Teste grátis de 7 dias
--   4. Eventos de medição do funil — internos, sem ferramenta de terceiros
--      e SEM dado de saúde (só o nome do evento e a origem)

-- =========================================================================
-- 1. Perfil
-- =========================================================================

alter table public.profiles
  add column medication_status text
    check (medication_status in ('usa', 'nao_usa', 'vai_comecar')),
  add column health_consent_at timestamptz,
  add column health_consent_version text,
  add column signup_utm jsonb;

comment on column public.profiles.medication_status is
  'Resposta a "Você usa medicação para emagrecer prescrita pelo seu médico?". Define a meta em destaque (proteína) — nunca gera recomendação de tratamento.';
comment on column public.profiles.health_consent_at is
  'Consentimento específico para tratamento de dados de saúde (LGPD art. 11). Versão do texto em health_consent_version.';

-- Signup: lê do metadata o que o formulário enviou. Valor inválido vira
-- null em vez de abortar o cadastro (mesma regra do celular no 0003).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_phone text := nullif(
    regexp_replace(coalesce(v_meta ->> 'phone', new.phone, ''), '\D', '', 'g'),
    ''
  );
  v_med text := v_meta ->> 'medication_status';
  v_consent text := v_meta ->> 'health_consent_version';
  v_utm jsonb := v_meta -> 'utm';
begin
  insert into public.profiles (
    id, full_name, email, phone,
    medication_status, health_consent_at, health_consent_version, signup_utm
  )
  values (
    new.id,
    v_meta ->> 'full_name',
    case when new.email ~ '^[^@\s]+@[^@\s]+$' then new.email end,
    case when v_phone ~ '^[0-9]{10,13}$' then v_phone end,
    case when v_med in ('usa', 'nao_usa', 'vai_comecar') then v_med end,
    case when v_consent is not null and char_length(v_consent) <= 20 then now() end,
    case when v_consent is not null and char_length(v_consent) <= 20 then v_consent end,
    -- Só chaves utm_*/referrer com valores curtos; qualquer outra coisa é descartada.
    case when jsonb_typeof(v_utm) = 'object' then (
      select jsonb_object_agg(key, left(value, 120))
      from jsonb_each_text(v_utm)
      where key in ('utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'referrer')
    ) end
  );

  insert into public.subscriptions (user_id, trial_ends_at)
  select new.id, coalesce(new.created_at, now()) + make_interval(days => s.trial_days)
  from public.app_settings s;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;

-- =========================================================================
-- 2. Planos
-- =========================================================================

alter table public.subscriptions
  add column plan text check (plan in ('mensal', 'anual', 'fundador')),
  -- Fundador é pagamento único: vale 12 meses e não renova.
  add column auto_renew boolean not null default true,
  -- Cobrança avulsa do plano fundador aguardando pagamento (para reaproveitar).
  add column asaas_pending_payment_id text,
  add column cancel_reason text check (cancel_reason in (
    'preco', 'nao_uso', 'faltou_recurso', 'parei_tratamento', 'problema_tecnico', 'outro'
  )),
  add column cancel_reason_note text check (char_length(cancel_reason_note) <= 500);

alter table public.app_settings
  add column founder_seats_total integer not null default 100 check (founder_seats_total >= 0);

-- 3. Teste grátis de 7 dias (vale para novos cadastros; testes em andamento
-- mantêm a data que já tinham).
alter table public.app_settings alter column trial_days set default 7;
update public.app_settings set trial_days = 7;

-- Acesso: assinatura ativa que NÃO renova (fundador) ou com cancelamento
-- pedido expira quando o período pago termina.
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
    when v_sub.is_active_subscription
         and (v_sub.cancel_requested_at is not null or not v_sub.auto_renew)
         and (v_sub.current_period_end is null or now() > v_sub.current_period_end) then 'expired'
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
-- 4. Eventos de medição (funil)
-- =========================================================================

-- Propriedades NUNCA carregam dado de saúde: só origem (utm), plano e motivo
-- de cancelamento. O nome do evento diz "registrou medicação", não qual.
create table public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  event text not null check (event in (
    'signup', 'meal_logged', 'medication_logged', 'subscribed', 'subscription_canceled'
  )),
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index analytics_events_event_created_idx on public.analytics_events (event, created_at desc);
create index analytics_events_user_idx on public.analytics_events (user_id);

-- Só o master lê; ninguém escreve via PostgREST (escrita é server-side).
alter table public.analytics_events enable row level security;
create policy master_select on public.analytics_events
  for select using ((select public.is_master()));
