-- 0011_self_service.sql
-- Autoatendimento (Fase 12):
--   1. Cancelamento pelo próprio usuário: a assinatura continua valendo até
--      o fim do período já pago (current_period_end), depois expira.
--   2. Preferências no perfil: boas-vindas concluída, som e vibração.

-- =========================================================================
-- 1. Cancelamento no fim do período
-- =========================================================================

alter table public.subscriptions
  add column cancel_requested_at timestamptz;

comment on column public.subscriptions.cancel_requested_at is
  'Usuário pediu cancelamento. Acesso segue até current_period_end; depois expira. Webhook SUBSCRIPTION_DELETED não corta antes disso.';

-- Mesma assinatura do 0004; nova regra: ativo com cancelamento pedido e
-- período vencido vira "expired".
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
         and v_sub.cancel_requested_at is not null
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
-- 2. Preferências do perfil (editáveis pelo próprio usuário)
-- =========================================================================

alter table public.profiles
  add column onboarding_completed_at timestamptz,
  add column sound_enabled boolean not null default true,
  add column haptics_enabled boolean not null default true;

-- Usuários que já existem não devem ver o assistente de boas-vindas.
update public.profiles set onboarding_completed_at = now() where onboarding_completed_at is null;
