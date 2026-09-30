-- Para novos masters, mantenha somente as colunas padrão do Kanban.
-- Nenhuma tabela ou dado financeiro existente é alterado.
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
  return new;
end;
$$;

drop trigger if exists seed_user_defaults on public.profiles;
create trigger seed_user_defaults
  after insert or update of role on public.profiles
  for each row execute function public.seed_user_defaults();
revoke execute on function public.seed_user_defaults() from public;
