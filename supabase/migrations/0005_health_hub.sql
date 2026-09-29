-- 0005_health_hub.sql
-- Núcleo do produto (docs/escopo-produto.md, requisitos 14–17):
--   1. Medicação / peptídeos: cadastro + diário de aplicações (dose, local,
--      efeitos colaterais). O app REGISTRA a prescrição; nunca sugere dose.
--   2. Medidas corporais (documentação da progressão além do peso)
--   3. Catálogo de alimentos + itens de refeição (entrada sem digitar kcal)
--   4. Programas de treino prontos + matrícula + registro
--   5. Dicas / mentoria (conteúdo do master)
--   6. Lembrete do tipo "medicacao" no Google Agenda
-- Mesmo padrão de RLS do 0003: dono vê o seu, master vê tudo, catálogos
-- publicados são de leitura para usuários autenticados.

-- =========================================================================
-- 1. Medicação / peptídeos
-- =========================================================================

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  category text not null default 'glp1'
    check (category in ('glp1', 'peptideo', 'hormonal', 'outro')),
  route text not null default 'subcutanea'
    check (route in ('subcutanea', 'oral', 'intramuscular', 'topica', 'outra')),
  -- Dose PRESCRITA, informada pelo usuário. Nunca calculada pelo app.
  dose_amount numeric(8, 3) check (dose_amount > 0),
  dose_unit text not null default 'mg'
    check (dose_unit in ('mg', 'mcg', 'ui', 'ml', 'comprimido', 'clique')),
  frequency text not null default 'semanal'
    check (frequency in ('diaria', 'semanal', 'quinzenal', 'personalizada')),
  -- 0 = domingo … 6 = sábado (semanal/personalizada)
  days_of_week smallint[] check (
    days_of_week is null or days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  started_on date,
  is_active boolean not null default true,
  prescribed_by text check (char_length(prescribed_by) <= 120),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index medications_user_idx on public.medications (user_id) where is_active;

create table public.medication_logs (
  id uuid primary key default gen_random_uuid(), -- gerado no cliente (idempotência)
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  log_date date not null,
  taken_at timestamptz not null default now(),
  dose_amount numeric(8, 3) check (dose_amount > 0),
  dose_unit text check (dose_unit in ('mg', 'mcg', 'ui', 'ml', 'comprimido', 'clique')),
  -- Rodízio do local de aplicação (subcutânea/intramuscular)
  injection_site text check (injection_site in (
    'abdomen_esq', 'abdomen_dir', 'coxa_esq', 'coxa_dir',
    'braco_esq', 'braco_dir', 'gluteo_esq', 'gluteo_dir'
  )),
  side_effects text[] not null default '{}' check (side_effects <@ array[
    'nausea', 'vomito', 'diarreia', 'constipacao', 'azia', 'dor_abdominal',
    'fadiga', 'dor_cabeca', 'tontura', 'perda_apetite', 'reacao_local', 'outro'
  ]::text[]),
  -- 0 nenhum · 1 leve · 2 moderado · 3 forte
  severity smallint not null default 0 check (severity between 0 and 3),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);

create index medication_logs_user_date_idx on public.medication_logs (user_id, log_date desc);
create index medication_logs_medication_idx on public.medication_logs (medication_id, taken_at desc);

-- =========================================================================
-- 2. Medidas corporais
-- =========================================================================

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_at date not null,
  waist_cm numeric(5, 1) check (waist_cm between 30 and 250),
  hip_cm numeric(5, 1) check (hip_cm between 30 and 250),
  chest_cm numeric(5, 1) check (chest_cm between 30 and 250),
  arm_cm numeric(5, 1) check (arm_cm between 10 and 100),
  thigh_cm numeric(5, 1) check (thigh_cm between 20 and 150),
  neck_cm numeric(5, 1) check (neck_cm between 15 and 80),
  body_fat_pct numeric(4, 1) check (body_fat_pct between 2 and 70),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, logged_at)
);

-- =========================================================================
-- 3. Alimentos
-- =========================================================================

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  category text not null check (category in (
    'proteina', 'carboidrato', 'leguminosa', 'fruta', 'vegetal', 'laticinio',
    'gordura', 'bebida', 'lanche', 'preparacao'
  )),
  portion_label text not null check (char_length(portion_label) between 1 and 60),
  portion_g numeric(6, 1) not null check (portion_g > 0),
  kcal numeric(6, 1) not null check (kcal >= 0),
  protein_g numeric(5, 1) not null default 0 check (protein_g >= 0),
  carbs_g numeric(5, 1) not null default 0 check (carbs_g >= 0),
  fat_g numeric(5, 1) not null default 0 check (fat_g >= 0),
  source text not null default 'TACO 4ª ed. (valores aproximados)',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, portion_label)
);

-- Busca por nome sem acento/caixa (ilike simples; catálogo pequeno).
create index foods_name_idx on public.foods (lower(name));

create table public.meal_log_items (
  id uuid primary key default gen_random_uuid(), -- gerado no cliente
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_log_id uuid not null references public.meal_logs (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  -- Cópia do nome/valores no momento do registro: editar o catálogo depois
  -- não reescreve o histórico do usuário.
  name text not null check (char_length(name) between 1 and 120),
  servings numeric(5, 2) not null default 1 check (servings > 0 and servings <= 20),
  kcal numeric(7, 1) not null check (kcal >= 0),
  protein_g numeric(6, 1) not null default 0,
  carbs_g numeric(6, 1) not null default 0,
  fat_g numeric(6, 1) not null default 0,
  created_at timestamptz not null default now()
);

create index meal_log_items_meal_idx on public.meal_log_items (meal_log_id);
create index meal_log_items_user_food_idx on public.meal_log_items (user_id, created_at desc);

-- Totais da refeição = soma dos itens, sempre que houver itens. Sem itens
-- (última remoção), os totais zeram para não sobrar número "fantasma".
create function public.recompute_meal_totals()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_meal uuid := coalesce(new.meal_log_id, old.meal_log_id);
begin
  update public.meal_logs m set
    calories = t.kcal,
    protein_g = t.protein,
    carbs_g = t.carbs,
    fat_g = t.fat
  from (
    select coalesce(sum(kcal), 0) as kcal, coalesce(sum(protein_g), 0) as protein,
           coalesce(sum(carbs_g), 0) as carbs, coalesce(sum(fat_g), 0) as fat
    from public.meal_log_items where meal_log_id = v_meal
  ) t
  where m.id = v_meal;
  return null;
end;
$$;

create trigger recompute_meal_totals
  after insert or update or delete on public.meal_log_items
  for each row execute function public.recompute_meal_totals();

-- =========================================================================
-- 4. Programas de treino
-- =========================================================================

create table public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  goal text not null check (goal in (
    'emagrecimento', 'hipertrofia', 'condicionamento', 'corrida', 'iniciante', 'mobilidade'
  )),
  level text not null check (level in ('iniciante', 'intermediario', 'avancado')),
  location text not null check (location in ('academia', 'casa', 'ar_livre')),
  days_per_week smallint not null check (days_per_week between 1 and 7),
  -- null = rotina que se repete; preenchido = progressão linear (ex.: corrida)
  duration_weeks smallint check (duration_weeks between 1 and 52),
  session_minutes smallint check (session_minutes between 5 and 240),
  summary text not null check (char_length(summary) <= 200),
  description text,
  is_published boolean not null default true,
  order_index smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.workout_programs (id) on delete cascade,
  -- Ordem de execução dentro do programa (1, 2, 3…). Para rotinas que se
  -- repetem é o dia do ciclo; para progressões lineares é a sessão N.
  sequence smallint not null check (sequence > 0),
  week smallint check (week > 0),
  title text not null,
  focus text,
  kind text not null check (kind in ('forca', 'cardio', 'corrida', 'hiit', 'mobilidade')),
  estimated_minutes smallint check (estimated_minutes between 5 and 240),
  unique (program_id, sequence)
);

create table public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.program_workouts (id) on delete cascade,
  order_index smallint not null default 0,
  name text not null,
  sets smallint check (sets between 1 and 20),
  reps text, -- "8-12", "até a falha", "30 s"
  rest_seconds smallint check (rest_seconds between 0 and 600),
  duration_seconds integer check (duration_seconds between 5 and 14400),
  distance_m integer check (distance_m between 10 and 100000),
  intensity text, -- "ritmo de conversa", "RPE 7"
  notes text
);

create index program_workouts_program_idx on public.program_workouts (program_id, sequence);
create index program_exercises_workout_idx on public.program_exercises (workout_id, order_index);

create table public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null references public.workout_programs (id) on delete cascade,
  started_on date not null,
  is_active boolean not null default true,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- Um programa ativo por usuário.
create unique index program_enrollments_one_active on public.program_enrollments (user_id)
  where is_active;

create table public.program_workout_logs (
  id uuid primary key default gen_random_uuid(), -- gerado no cliente
  user_id uuid not null references auth.users (id) on delete cascade,
  enrollment_id uuid not null references public.program_enrollments (id) on delete cascade,
  program_workout_id uuid not null references public.program_workouts (id) on delete cascade,
  performed_on date not null,
  duration_minutes smallint check (duration_minutes between 1 and 600),
  -- Percepção de esforço 1 (muito leve) … 5 (máximo)
  effort smallint check (effort between 1 and 5),
  notes text check (char_length(notes) <= 1000),
  -- Detalhe opcional por exercício: [{ "exercise_id", "sets_done", "reps", "weight_kg" }]
  exercise_results jsonb,
  created_at timestamptz not null default now(),
  unique (enrollment_id, program_workout_id, performed_on)
);

create index program_workout_logs_user_idx on public.program_workout_logs (user_id, performed_on desc);

-- =========================================================================
-- 5. Dicas / mentoria
-- =========================================================================

create table public.tips (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 10 and 8000),
  category text not null check (category in (
    'alimentacao', 'treino', 'medicacao', 'mentalidade', 'comunidade', 'app'
  )),
  read_minutes smallint not null default 2 check (read_minutes between 1 and 60),
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tips_published_idx on public.tips (published_at desc) where is_published;

-- =========================================================================
-- 6. Lembrete de medicação
-- =========================================================================

alter table public.calendar_reminders drop constraint calendar_reminders_kind_check;
alter table public.calendar_reminders add constraint calendar_reminders_kind_check
  check (kind in ('treino', 'refeicoes', 'agua', 'pesagem', 'medicacao'));

-- =========================================================================
-- updated_at
-- =========================================================================

create trigger set_updated_at before update on public.medications
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.foods
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.workout_programs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tips
  for each row execute function public.set_updated_at();

-- =========================================================================
-- RLS
-- =========================================================================

-- Tabelas do usuário: dono + master.
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'medications', 'body_measurements', 'program_enrollments'
    ])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy owner_full_access on public.%I for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t
    );
    execute format(
      'create policy master_full_access on public.%I for all using ((select public.is_master())) with check ((select public.is_master()))',
      t
    );
  end loop;
end $$;

-- Filhos com FK para um pai do usuário: o dono precisa ser dono do pai
-- também (impede anexar log ao medicamento/refeição/matrícula de outro).
alter table public.medication_logs enable row level security;
create policy owner_full_access on public.medication_logs
  for all using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.medications m
      where m.id = medication_logs.medication_id and m.user_id = (select auth.uid())
    )
  );
create policy master_full_access on public.medication_logs
  for all using ((select public.is_master())) with check ((select public.is_master()));

alter table public.meal_log_items enable row level security;
create policy owner_full_access on public.meal_log_items
  for all using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.meal_logs m
      where m.id = meal_log_items.meal_log_id and m.user_id = (select auth.uid())
    )
  );
create policy master_full_access on public.meal_log_items
  for all using ((select public.is_master())) with check ((select public.is_master()));

alter table public.program_workout_logs enable row level security;
create policy owner_full_access on public.program_workout_logs
  for all using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.program_enrollments e
      where e.id = program_workout_logs.enrollment_id and e.user_id = (select auth.uid())
    )
  );
create policy master_full_access on public.program_workout_logs
  for all using ((select public.is_master())) with check ((select public.is_master()));

-- Catálogos: leitura do que está publicado para quem está logado; escrita
-- só master. (Não anon: o conteúdo é parte do produto pago.)
do $$
declare
  t text;
begin
  for t in select unnest(array['foods', 'workout_programs', 'tips'])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy authenticated_select on public.%I for select to authenticated using (is_published)',
      t
    );
    execute format(
      'create policy master_full_access on public.%I for all using ((select public.is_master())) with check ((select public.is_master()))',
      t
    );
  end loop;
end $$;

alter table public.program_workouts enable row level security;
create policy authenticated_select on public.program_workouts
  for select to authenticated using (
    exists (select 1 from public.workout_programs p where p.id = program_workouts.program_id and p.is_published)
  );
create policy master_full_access on public.program_workouts
  for all using ((select public.is_master())) with check ((select public.is_master()));

alter table public.program_exercises enable row level security;
create policy authenticated_select on public.program_exercises
  for select to authenticated using (
    exists (
      select 1 from public.program_workouts w
      join public.workout_programs p on p.id = w.program_id
      where w.id = program_exercises.workout_id and p.is_published
    )
  );
create policy master_full_access on public.program_exercises
  for all using ((select public.is_master())) with check ((select public.is_master()));
