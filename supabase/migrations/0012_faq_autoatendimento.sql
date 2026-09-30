-- 0012_faq_autoatendimento.sql
-- FAQ passa a refletir o autoatendimento da Fase 12 (cancelar assinatura,
-- excluir conta, trocar senha e preferências sem falar com o suporte).

update public.faq_items set answer =
  E'Em Minha conta → Assinatura, toque em "Cancelar assinatura". As cobranças futuras param na hora e seu acesso continua até o fim do período que você já pagou.\n\nMudou de ideia? É só assinar de novo quando o acesso terminar.'
where question = 'Como cancelo a assinatura?';

update public.faq_items set answer =
  E'Em Minha conta → Excluir conta. Digite EXCLUIR e sua senha para confirmar: sua conta e todos os seus registros são apagados definitivamente, a assinatura é cancelada e a conexão com o Google Agenda é removida.\n\nEssa ação não pode ser desfeita.'
where question = 'Como excluo minha conta e meus dados?';

insert into public.faq_items (question, answer, category, order_index) values
  ('Como troco minha senha ou meus dados?',
   E'Em Minha conta você edita nome, celular e fuso horário, troca a senha (informando a atual) e escolhe tema claro/escuro, sons e vibração.',
   'Conta e privacidade', 15),
  ('Dá para desligar os sons e a vibração?',
   E'Sim. Em Minha conta → Preferências, ligue ou desligue os sons de confirmação e a vibração. No iPhone, o navegador não permite vibração — só os sons.',
   'Conta e privacidade', 25)
on conflict (question) do nothing;
