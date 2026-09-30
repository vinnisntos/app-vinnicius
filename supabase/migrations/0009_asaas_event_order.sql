-- Ignora eventos antigos entregues depois de eventos mais recentes.
alter table public.subscriptions
  add column last_asaas_event_at timestamptz;
