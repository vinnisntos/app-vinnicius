-- 0014_fase0_faq.sql
-- Ajuda alinhada à Fase 0: teste de 7 dias, três planos e dados de saúde.
-- Idempotente (índice único em question, do 0006).

update public.faq_items
set answer = E'Você tem 7 dias grátis com acesso completo a partir do cadastro, sem cartão. Nesse período aparecem lembretes de que o teste vai acabar. Você pode assinar a qualquer momento — não precisa esperar o fim do teste.'
where question = 'Como funciona o período grátis?';

insert into public.faq_items (question, answer, category, order_index) values
  ('Quais são os planos?',
   E'São três: mensal (R$ 19,90 por mês), anual (R$ 149,00 por ano) e fundador (R$ 67,00 em pagamento único no Pix, com 12 meses de acesso).\n\nO plano fundador tem vagas limitadas e não renova sozinho: ao fim dos 12 meses você escolhe se quer continuar.',
   'Assinatura', 5),
  ('Como baixo os meus dados?',
   E'Em Minha conta → Tratamento e dados de saúde → Baixar meus dados. Você recebe um arquivo com tudo o que registrou. Seus dados de saúde são usados apenas para o funcionamento do app e não vão para ferramentas de terceiros.',
   'Conta e privacidade', 35)
on conflict (question) do nothing;
