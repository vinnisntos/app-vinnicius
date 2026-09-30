-- Dados legados pertencem apenas ao master. Não remove dados já existentes.
create or replace function public.seed_user_defaults()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role <> 'master' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.role = 'master' then
      return new;
    end if;
  end if;

  if not exists (select 1 from public.kanban_columns where user_id = new.id) then
    insert into public.kanban_columns (user_id, name, order_index) values
      (new.id, 'A Fazer', 0), (new.id, 'Fazendo', 1), (new.id, 'Feito', 2);
  end if;
  if not exists (select 1 from public.finance_categories where user_id = new.id) then
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
  end if;
  return new;
end;
$$;

drop trigger if exists seed_user_defaults on public.profiles;
create trigger seed_user_defaults
  after insert or update of role on public.profiles
  for each row execute function public.seed_user_defaults();
revoke execute on function public.seed_user_defaults() from public;
