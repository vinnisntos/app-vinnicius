-- 0002_workout_unique_constraints.sql
-- Faltava no baseline: sem essas constraints, recarregar a tela de treino
-- podia criar sessões duplicadas para o mesmo dia, e reeditar uma série já
-- registrada duplicava a linha em vez de atualizar (mesmo padrão já usado
-- em weight_logs/meal_logs no 0001_init.sql).

alter table public.workout_sessions
  add constraint workout_sessions_user_date_key unique (user_id, performed_at);

alter table public.workout_set_logs
  add constraint workout_set_logs_session_exercise_set_key
  unique (session_id, exercise_id, set_number);
