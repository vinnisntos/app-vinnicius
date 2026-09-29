-- 0007_fix_meal_totals_trigger_privileges.sql
-- Bug do 0005: o trigger recompute_meal_totals rodava com o papel de quem
-- disparou a remoção. Ao excluir um usuário pelo Supabase Auth, o cascade
-- apaga meal_log_items como `supabase_auth_admin`, que não tem permissão em
-- public.meal_logs → "Database error deleting user" (500). Qualquer usuário
-- que registrou alimentos ficava impossível de excluir (LGPD).
--
-- Verificação: reproduzido no Supabase real (deleteUser → 500 para usuário
-- com item de refeição; ok após esta migration). O PGlite NÃO reproduz —
-- lá tudo roda como superusuário — então não confie nele para bugs de
-- privilégio entre papéis.
--
-- Correção: SECURITY DEFINER. Seguro porque a função só recalcula os totais
-- da refeição dona do item que mudou, a partir dos itens dessa mesma
-- refeição — não recebe entrada do cliente nem toca outras linhas.

create or replace function public.recompute_meal_totals()
returns trigger
language plpgsql
security definer
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

-- Função de trigger, não de API (mesmo padrão de handle_new_user no 0001).
revoke execute on function public.recompute_meal_totals() from public;
