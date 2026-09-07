-- 0001_init.sql
-- Baseline do schema do Life OS. Mantido em SQL puro e versionado à mão
-- (ver ADR-0001) — é a fonte de verdade; o schema Drizzle em
-- src/lib/db/schema/ espelha exatamente estas tabelas para dar tipos ao app.

-- =========================================================================
-- profiles
-- =========================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil do usuário, 1:1 com auth.users.';

-- =========================================================================
-- Alimentação
-- =========================================================================

create table public.nutrition_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sex text not null check (sex in ('M', 'F')),
  birth_date date not null,
  height_cm numeric(5, 1) not null,
  activity_level text not null check (
    activity_level in ('sedentario', 'leve', 'moderado', 'ativo', 'muito_ativo')
  ),
  formula text not null default 'mifflin_st_jeor',
  calorie_goal numeric(6, 1) not null default 2500,
  water_goal_ml integer not null default 3000,
  updated_at timestamptz not null default now()
);

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_at date not null,
  weight_kg numeric(5, 2) not null,
  unique (user_id, logged_at)
);

create index weight_logs_user_id_idx on public.weight_logs (user_id);

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  meal_slot text not null check (
    meal_slot in ('cafe_da_manha', 'almoco', 'lanche', 'jantar', 'ceia')
  ),
  description text,
  calories numeric(6, 1),
  is_completed boolean not null default false,
  completed_at timestamptz,
  unique (user_id, log_date, meal_slot)
);

create index meal_logs_user_id_idx on public.meal_logs (user_id);

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  amount_ml integer not null check (amount_ml > 0),
  logged_at timestamptz not null default now()
);

create index water_logs_user_id_idx on public.water_logs (user_id);
create index water_logs_user_date_idx on public.water_logs (user_id, log_date);

-- =========================================================================
-- Treinos
-- =========================================================================

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_active boolean not null default true
);

create index workout_plans_user_id_idx on public.workout_plans (user_id);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  day_label text not null check (day_label in ('A', 'B')),
  name text not null,
  target_sets smallint not null check (target_sets > 0),
  target_reps text not null,
  order_index smallint not null default 0
);

create index workout_exercises_plan_id_idx on public.workout_exercises (plan_id);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  day_label text not null check (day_label in ('A', 'B')),
  performed_at date not null,
  notes text
);

create index workout_sessions_user_id_idx on public.workout_sessions (user_id);
create index workout_sessions_plan_id_idx on public.workout_sessions (plan_id);

create table public.workout_set_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  set_number smallint not null check (set_number > 0),
  reps_done smallint not null check (reps_done >= 0),
  weight_kg numeric(5, 2)
);

create index workout_set_logs_session_id_idx on public.workout_set_logs (session_id);
create index workout_set_logs_exercise_id_idx on public.workout_set_logs (exercise_id);

-- =========================================================================
-- Financeiro
-- =========================================================================

create table public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('receita', 'despesa')),
  color text not null default '#a855f7'
);

create index finance_categories_user_id_idx on public.finance_categories (user_id);

create table public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.finance_categories (id) on delete set null,
  type text not null check (
    type in ('receita_fixa', 'receita_variavel', 'despesa')
  ),
  description text not null,
  amount numeric(10, 2) not null check (amount > 0),
  occurred_on date not null,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

create index finance_transactions_user_id_idx on public.finance_transactions (user_id);
create index finance_transactions_category_id_idx on public.finance_transactions (category_id);
create index finance_transactions_user_date_idx on public.finance_transactions (user_id, occurred_on);

-- =========================================================================
-- Estudos e Trabalhos (Kanban)
-- =========================================================================

create table public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  order_index smallint not null default 0
);

create index kanban_columns_user_id_idx on public.kanban_columns (user_id);

create table public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  column_id uuid not null references public.kanban_columns (id) on delete cascade,
  title text not null,
  description text,
  category text not null check (
    category in ('faculdade', 'estagio', 'projeto_pessoal')
  ),
  priority text not null default 'media' check (priority in ('baixa', 'media', 'alta')),
  due_date date,
  order_index smallint not null default 0,
  completed_at timestamptz
);

create index kanban_cards_user_id_idx on public.kanban_cards (user_id);
create index kanban_cards_column_id_idx on public.kanban_cards (column_id);
create index kanban_cards_user_due_idx on public.kanban_cards (user_id, due_date);

-- =========================================================================
-- Row Level Security — mesma policy em toda tabela de domínio (ver
-- docs/06-seguranca.md sobre o alcance real desta proteção pela via Drizzle).
--
-- `(select auth.uid())` em vez de `auth.uid()` solto: dentro de uma policy,
-- a forma solta é reavaliada linha a linha; envolver em subquery vira um
-- InitPlan avaliado uma única vez por query (recomendação do linter do
-- Supabase — auth_rls_initplan).
-- =========================================================================

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'nutrition_profile', 'weight_logs', 'meal_logs', 'water_logs',
      'workout_plans', 'workout_sessions',
      'finance_categories', 'finance_transactions',
      'kanban_columns', 'kanban_cards'
    ])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy owner_full_access on public.%I for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t
    );
  end loop;
end $$;

-- profiles usa "id" como chave, não "user_id" — policy própria (fora do loop
-- genérico acima, que assume a coluna user_id).
alter table public.profiles enable row level security;
create policy owner_full_access on public.profiles
  for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- nutrition_profile usa "user_id" como chave primária — a policy genérica
-- acima já cobre (a coluna se chama user_id igual às demais).

-- Tabelas sem user_id próprio (isolam via join com a tabela dona):
alter table public.workout_exercises enable row level security;
create policy owner_full_access on public.workout_exercises
  for all using (
    exists (
      select 1 from public.workout_plans p
      where p.id = workout_exercises.plan_id and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workout_plans p
      where p.id = workout_exercises.plan_id and p.user_id = (select auth.uid())
    )
  );

alter table public.workout_set_logs enable row level security;
create policy owner_full_access on public.workout_set_logs
  for all using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_set_logs.session_id and s.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_set_logs.session_id and s.user_id = (select auth.uid())
    )
  );

-- =========================================================================
-- Triggers utilitários
-- =========================================================================

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.nutrition_profile
  for each row execute function public.set_updated_at();

-- Ao criar um usuário no Supabase Auth, cria o profile correspondente.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Função de trigger, não de API — sem isso o PostgREST expõe
-- /rest/v1/rpc/handle_new_user para anon/authenticated por padrão.
-- Revoga de PUBLIC, não só de anon/authenticated: EXECUTE é concedido a
-- PUBLIC por padrão na criação da function, e anon/authenticated herdam
-- desse grant — revogar só dos papéis nomeados não remove esse acesso.
revoke execute on function public.handle_new_user() from public;

-- Ao criar um profile, semeia colunas de Kanban e categorias financeiras
-- padrão para o novo usuário (ver docs/03-modelo-de-dados.md).
create function public.seed_user_defaults()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.kanban_columns (user_id, name, order_index) values
    (new.id, 'A Fazer', 0),
    (new.id, 'Fazendo', 1),
    (new.id, 'Feito', 2);

  insert into public.finance_categories (user_id, name, kind, color) values
    (new.id, 'Moradia', 'despesa', '#f87171'),
    (new.id, 'Mercado', 'despesa', '#fb923c'),
    (new.id, 'Transporte', 'despesa', '#facc15'),
    (new.id, 'Faculdade', 'despesa', '#60a5fa'),
    (new.id, 'Lazer', 'despesa', '#c084fc'),
    (new.id, 'Saúde', 'despesa', '#4ade80'),
    (new.id, 'Estágio', 'receita', '#a855f7'),
    (new.id, 'Corridas de App', 'receita', '#9333ea'),
    (new.id, 'Outros', 'receita', '#6b7280');

  return new;
end;
$$;

create trigger seed_user_defaults
  after insert on public.profiles
  for each row execute function public.seed_user_defaults();

revoke execute on function public.seed_user_defaults() from public;
