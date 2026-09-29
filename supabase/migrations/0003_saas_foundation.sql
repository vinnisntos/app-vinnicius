-- 0003_saas_foundation.sql
-- Pivot Life OS → SaaS (hub de saúde/emagrecimento/mentoria).
-- Aditiva sobre 0001/0002: nenhuma tabela existente é removida.
--
-- Conteúdo:
--   1. profiles: papel (master/user), e-mail e celular de catálogo
--   2. Helpers de autorização (is_master) + trava de colunas privilegiadas
--   3. subscriptions: trial de N dias + assinatura Asaas + aprovação manual
--   4. get_access_status(): fonte única do paywall (has_access/show_nag_screen)
--   5. Alimentação: objetivo, peso-alvo, macros e updated_at para sync otimista
--   6. Comunidade: posts (com meal_log opcional) + reações
--   7. Conteúdo: FAQ, tooltips de ajuda, configurações globais (WhatsApp/Asaas)
--   8. RLS: owner vê o próprio dado, comunidade vê posts públicos, master vê tudo
--
-- Lembrete (docs/06-seguranca.md): o runtime Drizzle conecta como `postgres`
-- e IGNORA RLS. Tudo abaixo protege a via supabase-js/PostgREST; na via
-- Drizzle, papel e paywall precisam ser checados na camada de aplicação
-- (requireUserId + get_access_status).

-- =========================================================================
-- 1. profiles — papel e contato
-- =========================================================================

alter table public.profiles
  add column role text not null default 'user',
  add column email text,
  add column phone text;

-- Backfill antes das constraints: e-mail real vem do Supabase Auth.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id;

alter table public.profiles
  add constraint profiles_role_check check (role in ('master', 'user')),
  -- Validação básica pedida: precisa ter "@" com algo antes e depois.
  add constraint profiles_email_check
    check (email is null or email ~ '^[^@\s]+@[^@\s]+$'),
  -- Só dígitos (DDI+DDD+número). Catálogo apenas — não é usado para login.
  add constraint profiles_phone_check
    check (phone is null or phone ~ '^[0-9]{10,13}$');

create index profiles_role_idx on public.profiles (role) where role = 'master';

comment on column public.profiles.role is
  'master = administrador (gerencia assinaturas); user = assinante. Só master altera.';
comment on column public.profiles.email is
  'Cópia de auth.users.email para o painel admin — sincronizada por trigger, não editável pelo usuário.';
comment on column public.profiles.phone is
  'Celular só dígitos (ex. 5511999998888). Catálogo, sem uso em autenticação.';

-- =========================================================================
-- 2. Helpers de autorização
-- =========================================================================

-- security definer: lê profiles sem passar pela RLS de profiles (evita
-- recursão quando usado dentro das próprias policies de profiles).
create function public.is_master()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'master'
  );
$$;

revoke execute on function public.is_master() from public;
-- anon também: toda policy master_full_access chama is_master(), e sem o
-- grant um SELECT anônimo em qualquer tabela vira erro em vez de 0 linhas.
-- Para anon, auth.uid() é null → sempre false.
grant execute on function public.is_master() to anon, authenticated;

-- Impede escalada de privilégio via PostgREST: um `user` não pode se
-- promover a master nem sobrescrever o e-mail sincronizado do Auth.
-- Só age quando a chamada vem de um JWT de usuário (auth.role() =
-- 'authenticated'); triggers do Auth, service role e Drizzle passam direto.
create function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'authenticated' or public.is_master() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role <> 'user' then
      raise exception 'Somente master pode definir role' using errcode = '42501';
    end if;
  elsif new.role is distinct from old.role or new.email is distinct from old.email then
    raise exception 'Somente master pode alterar role/email' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger protect_profile_privileged_columns
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- =========================================================================
-- 3. Configurações globais (singleton) — lida pelo trigger de signup
-- =========================================================================

create table public.app_settings (
  id boolean primary key default true check (id), -- garante linha única
  trial_days smallint not null default 3 check (trial_days between 0 and 30),
  -- Fallback de suporte: https://wa.me/<support_whatsapp>?text=<mensagem>
  support_whatsapp text check (support_whatsapp ~ '^[0-9]{12,13}$'),
  support_whatsapp_message text,
  -- Link de pagamento/checkout do Asaas usado pelo CTA da nag screen.
  asaas_checkout_url text check (asaas_checkout_url ~ '^https://'),
  updated_at timestamptz not null default now()
);

insert into public.app_settings default values;

comment on table public.app_settings is
  'Configuração global do SaaS (linha única). Editável só por master.';

-- =========================================================================
-- 4. subscriptions — trial + Asaas + aprovação manual pelo master
-- =========================================================================

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'trialing' check (
    status in ('trialing', 'active', 'past_due', 'canceled', 'revoked')
  ),
  -- Flag pedida no escopo. Derivada de `status` para nunca divergir dele.
  is_active_subscription boolean generated always as (status = 'active') stored,
  -- created_at do auth.users + app_settings.trial_days (default 3 dias).
  -- Coluna própria (não calculada) para o master poder estender um trial.
  trial_ends_at timestamptz not null,
  current_period_end timestamptz,
  asaas_customer_id text unique,
  asaas_subscription_id text unique,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  revoked_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_status_idx on public.subscriptions (status);
create index subscriptions_trial_ends_at_idx on public.subscriptions (trial_ends_at)
  where status = 'trialing';

comment on table public.subscriptions is
  'Estado de acesso do assinante. Escrita só por master (painel admin) ou service role (webhook Asaas).';

-- Backfill: usuários existentes recebem trial contado do próprio cadastro.
insert into public.subscriptions (user_id, trial_ends_at)
select u.id, u.created_at + make_interval(days => s.trial_days)
from auth.users u
cross join public.app_settings s
where exists (select 1 from public.profiles p where p.id = u.id)
on conflict (user_id) do nothing;

-- Paywall em um único lugar. Estados:
--   master  → acesso total, sem nag
--   active  → assinatura paga/aprovada
--   trial   → dentro do trial: acesso + show_nag_screen = true
--   expired → trial acabou sem assinatura (ou status past_due/canceled)
--   revoked → master revogou
-- `server_now` permite ao front calcular o countdown sem depender do relógio
-- do aparelho.
create function public.get_access_status(p_user_id uuid)
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
  -- Via PostgREST um user só consulta o próprio status.
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
    v_state = 'trial',
    coalesce(v_sub.is_active_subscription, false),
    v_sub.trial_ends_at,
    now();
end;
$$;

revoke execute on function public.get_access_status(uuid) from public;
grant execute on function public.get_access_status(uuid) to authenticated;

-- =========================================================================
-- 5. Signup: profile + subscription (trial) + sync de e-mail
-- =========================================================================

-- Substitui a versão do 0001. Celular inválido vira null em vez de abortar
-- o signup (uma check violation aqui derrubaria o cadastro no Supabase Auth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_phone text := nullif(
    regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', new.phone, ''), '\D', '', 'g'),
    ''
  );
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    case when new.email ~ '^[^@\s]+@[^@\s]+$' then new.email end,
    case when v_phone ~ '^[0-9]{10,13}$' then v_phone end
  );

  insert into public.subscriptions (user_id, trial_ends_at)
  select new.id, coalesce(new.created_at, now()) + make_interval(days => s.trial_days)
  from public.app_settings s;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;

create function public.handle_user_email_updated()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

revoke execute on function public.handle_user_email_updated() from public;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_updated();

-- =========================================================================
-- 6. Alimentação — objetivo de emagrecimento e sync otimista
-- =========================================================================

alter table public.nutrition_profile
  add column goal text not null default 'emagrecer'
    check (goal in ('emagrecer', 'manter', 'ganhar')),
  add column target_weight_kg numeric(5, 2) check (target_weight_kg > 0);

comment on column public.nutrition_profile.calorie_goal is
  'Meta manual. A recomendação (TDEE ajustado por goal) é derivada, nunca armazenada.';

-- Macros opcionais + timestamps. O front gera o `id` (uuid v4) e faz upsert
-- em (user_id, log_date, meal_slot) — retries do cache otimista são
-- idempotentes; updated_at resolve conflito por last-write-wins.
alter table public.meal_logs
  add column protein_g numeric(6, 1) check (protein_g >= 0),
  add column carbs_g numeric(6, 1) check (carbs_g >= 0),
  add column fat_g numeric(6, 1) check (fat_g >= 0),
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now(),
  add constraint meal_logs_calories_check check (calories is null or calories >= 0);

create trigger set_updated_at
  before update on public.meal_logs
  for each row execute function public.set_updated_at();

-- water_logs já atende: linhas de incremento com `id` gerável no cliente
-- (insert idempotente por PK).

-- =========================================================================
-- 7. Comunidade
-- =========================================================================

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade, -- autor
  -- Log de dieta compartilhado (opcional). Some do post se a refeição for apagada.
  meal_log_id uuid references public.meal_logs (id) on delete set null,
  body text check (char_length(body) <= 2000),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  -- Moderação: só master altera (trigger abaixo).
  is_hidden boolean not null default false,
  hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Feed: posts públicos visíveis, mais recentes primeiro.
create index posts_feed_idx on public.posts (created_at desc)
  where visibility = 'public' and not is_hidden;
create index posts_user_id_idx on public.posts (user_id, created_at desc);
create index posts_meal_log_id_idx on public.posts (meal_log_id);

create trigger set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create function public.protect_post_moderation_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'authenticated' or public.is_master() then
    return new;
  end if;

  if (tg_op = 'INSERT' and (new.is_hidden or new.hidden_reason is not null))
     or (tg_op = 'UPDATE' and (new.is_hidden is distinct from old.is_hidden
                               or new.hidden_reason is distinct from old.hidden_reason)) then
    raise exception 'Somente master modera posts' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger protect_post_moderation_columns
  before insert or update on public.posts
  for each row execute function public.protect_post_moderation_columns();

-- "Impulso coletivo": uma reação por usuário por post.
create table public.post_reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'apoio' check (kind in ('apoio', 'forca', 'inspirador')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_reactions_user_id_idx on public.post_reactions (user_id);

-- Autor do post para o feed sem expor e-mail/celular (RLS de profiles é
-- só do dono). Função em vez de view security-definer (linter do Supabase).
create function public.get_community_profiles(p_ids uuid[])
returns table (id uuid, full_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.avatar_url
  from public.profiles p
  where p.id = any (p_ids);
$$;

revoke execute on function public.get_community_profiles(uuid[]) from public;
grant execute on function public.get_community_profiles(uuid[]) to authenticated;

-- =========================================================================
-- 8. Conteúdo de ajuda — FAQ e tooltips
-- =========================================================================

create table public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  order_index smallint not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index faq_items_published_idx on public.faq_items (category, order_index)
  where is_published;

-- Catálogo único de tooltips, endereçado por chave hierárquica em vez de uma
-- coluna "help" em cada tabela:
--   '<tabela>.<coluna>'  ex. 'meal_logs.calories'
--   'route.<rota>'       ex. 'route.alimentacao'
--   'metric.<nome>'      ex. 'metric.tdee'
create table public.help_tooltips (
  key text primary key check (key ~ '^[a-z0-9_]+(\.[a-z0-9_]+)+$'),
  title text,
  body text not null,
  faq_item_id uuid references public.faq_items (id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.faq_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.help_tooltips
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

insert into public.help_tooltips (key, title, body) values
  ('metric.tdee', 'Gasto diário (TDEE)',
   'Estimativa de quantas calorias seu corpo gasta por dia, somando metabolismo basal e atividade física.'),
  ('metric.bmr', 'Metabolismo basal',
   'Calorias gastas em repouso absoluto. Calculado pela fórmula Mifflin-St Jeor.'),
  ('nutrition_profile.activity_level', 'Nível de atividade',
   'Escolha pela sua rotina real da semana, não pela ideal. Na dúvida, escolha o nível abaixo.'),
  ('meal_logs.calories', 'Calorias da refeição',
   'Opcional. Se não souber, marque a refeição como feita mesmo assim — consistência vale mais que precisão.'),
  ('water_logs.amount_ml', 'Água',
   'Cada toque soma um copo. A meta diária pode ser ajustada no seu perfil.'),
  ('posts.visibility', 'Visibilidade',
   'Público aparece no feed da comunidade. Privado fica só no seu histórico.');

-- =========================================================================
-- 9. RLS
-- =========================================================================

-- 9.1 Master enxerga/edita tudo nas tabelas de domínio existentes.
-- Policy separada (permissive = OR) em vez de reescrever owner_full_access.
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'nutrition_profile', 'weight_logs', 'meal_logs', 'water_logs',
      'workout_plans', 'workout_exercises', 'workout_sessions', 'workout_set_logs',
      'finance_categories', 'finance_transactions',
      'kanban_columns', 'kanban_cards'
    ])
  loop
    execute format(
      'create policy master_full_access on public.%I for all using ((select public.is_master())) with check ((select public.is_master()))',
      t
    );
  end loop;
end $$;

-- 9.2 profiles: dono lê/edita (trigger trava role/email); sem insert/delete
-- pelo usuário — o 0001 permitia "for all", o que abria o vetor
-- delete + reinsert com role = 'master'. Linha nasce no signup e morre em
-- cascata com auth.users.
drop policy owner_full_access on public.profiles;

create policy owner_select on public.profiles
  for select using ((select auth.uid()) = id);
create policy owner_update on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy master_full_access on public.profiles
  for all using ((select public.is_master())) with check ((select public.is_master()));

-- 9.3 subscriptions: user só lê a própria; escrita é do master/service role.
alter table public.subscriptions enable row level security;

create policy owner_select on public.subscriptions
  for select using ((select auth.uid()) = user_id);
create policy master_full_access on public.subscriptions
  for all using ((select public.is_master())) with check ((select public.is_master()));

-- 9.4 posts
alter table public.posts enable row level security;

create policy community_or_owner_select on public.posts
  for select using (
    (visibility = 'public' and not is_hidden)
    or (select auth.uid()) = user_id
  );

-- Só pode anexar refeição própria.
create policy owner_insert on public.posts
  for insert with check (
    (select auth.uid()) = user_id
    and (
      meal_log_id is null
      or exists (
        select 1 from public.meal_logs m
        where m.id = posts.meal_log_id and m.user_id = (select auth.uid())
      )
    )
  );

create policy owner_update on public.posts
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      meal_log_id is null
      or exists (
        select 1 from public.meal_logs m
        where m.id = posts.meal_log_id and m.user_id = (select auth.uid())
      )
    )
  );

create policy owner_delete on public.posts
  for delete using ((select auth.uid()) = user_id);

create policy master_full_access on public.posts
  for all using ((select public.is_master())) with check ((select public.is_master()));

-- 9.5 meal_logs compartilhados: leitura liberada quando anexados a post
-- público visível (soma-se à owner_full_access do 0001).
-- A consulta a posts fica numa função security definer: um `exists` direto
-- aqui fecha o ciclo posts (insert check) → meal_logs → posts e o Postgres
-- aborta com "infinite recursion detected in policy".
create function public.is_meal_log_shared(p_meal_log_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.posts p
    where p.meal_log_id = p_meal_log_id
      and p.visibility = 'public'
      and not p.is_hidden
  );
$$;

revoke execute on function public.is_meal_log_shared(uuid) from public;
grant execute on function public.is_meal_log_shared(uuid) to anon, authenticated;

create policy community_shared_select on public.meal_logs
  for select using (public.is_meal_log_shared(id));

-- 9.6 post_reactions: a subquery em posts já passa pela RLS de posts, então
-- "post visível" = "post que eu consigo ler".
alter table public.post_reactions enable row level security;

create policy visible_post_select on public.post_reactions
  for select using (exists (select 1 from public.posts p where p.id = post_reactions.post_id));

create policy owner_insert on public.post_reactions
  for insert with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.posts p where p.id = post_reactions.post_id)
  );

create policy owner_update on public.post_reactions
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy owner_delete on public.post_reactions
  for delete using ((select auth.uid()) = user_id);

create policy master_full_access on public.post_reactions
  for all using ((select public.is_master())) with check ((select public.is_master()));

-- 9.7 Conteúdo público (FAQ publicado, tooltips, settings) — leitura para
-- anon também (tela de login/paywall), escrita só master.
alter table public.faq_items enable row level security;
alter table public.help_tooltips enable row level security;
alter table public.app_settings enable row level security;

create policy public_select on public.faq_items
  for select using (is_published);
create policy public_select on public.help_tooltips
  for select using (true);
create policy public_select on public.app_settings
  for select using (true);

create policy master_full_access on public.faq_items
  for all using ((select public.is_master())) with check ((select public.is_master()));
create policy master_full_access on public.help_tooltips
  for all using ((select public.is_master())) with check ((select public.is_master()));
create policy master_full_access on public.app_settings
  for all using ((select public.is_master())) with check ((select public.is_master()));

-- =========================================================================
-- Pós-migration (manual, uma vez): promover o dono do produto a master.
--   update public.profiles set role = 'master' where email = '<seu-email>';
-- =========================================================================
