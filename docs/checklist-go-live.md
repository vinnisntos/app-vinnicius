# Checklist de go-live — Life OS

Domínio de produção: `https://lifeos.vinnisantos.com.br`. Projeto Supabase documentado: `agenda-vinni` (`twjrojtdhkbdodtfebbu`). Execute na ordem. Segredos ficam somente no painel correspondente e em `/var/www/agenda-vinnisantos/.env.production` na EC2. Este repositório não aplicou migrations nem fez deploy.

## 1. Banco e autenticação Supabase

1. Abra **Supabase Dashboard → projeto `agenda-vinni` → SQL Editor → New query**. Cole o conteúdo integral de `supabase/migrations/0008_master_legacy_defaults.sql` e execute. Em outra query, faça o mesmo com `0009_asaas_event_order.sql`. Confirme que ambas terminaram sem erro. Não execute `0001`–`0007` novamente se já constarem aplicadas no histórico do projeto.
2. Verifique com `select pg_get_functiondef('public.seed_user_defaults()'::regprocedure);`: o corpo deve começar por `if new.role <> 'master'`. Verifique `select column_name from information_schema.columns where table_schema='public' and table_name='subscriptions' and column_name='last_asaas_event_at';`: deve retornar uma linha. Uma nova conta comum deve ter zero registros em `kanban_columns` e `finance_categories`; uma conta promovida a master deve receber os padrões. Não remova dados de contas existentes.
3. Em **Authentication → URL Configuration**, defina **Site URL** como `https://lifeos.vinnisantos.com.br`. Em **Redirect URLs**, adicione `https://lifeos.vinnisantos.com.br/auth/confirm` (e `http://localhost:3000/auth/confirm` somente se ainda usar desenvolvimento local). Salve. Teste cadastro/confirmação e redefinição de senha: o link deve voltar para o domínio de produção, sem erro de redirect.
4. Em **Project Settings → API**, copie a URL do projeto para `NEXT_PUBLIC_SUPABASE_URL`, a chave pública anon para `NEXT_PUBLIC_SUPABASE_ANON_KEY` e a chave secreta service_role para `SUPABASE_SERVICE_ROLE_KEY`. Em **Project Settings → Database → Connection string**, selecione **Transaction pooler** (porta `6543`) e copie a URI para `DATABASE_URL`; não use a porta `5432` de sessão.
5. Promova a conta do dono no **SQL Editor**: `update public.profiles set role='master' where email='<EMAIL_REAL_DO_DONO>' returning id,email,role;`. Confirme uma linha `master`; entre em `/admin` e confirme acesso. A migration 0008 semeia os dados legados ao promover.

## 2. Asaas e checkout

1. No **Asaas → Integrações → Chave de API**, gere a chave no ambiente sandbox e depois uma chave própria no ambiente de produção. Na EC2, defina `ASAAS_API_KEY` com a chave do ambiente escolhido e `ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3` para sandbox ou `https://api.asaas.com/v3` para produção. Defina `ASAAS_PLAN_VALUE` com a mensalidade decimal em reais, por exemplo `29.90`, e `ASAAS_PLAN_DESCRIPTION` com o texto exibido na cobrança.
2. Gere um token aleatório (por exemplo, `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Em **Asaas → Integrações → Webhooks → Adicionar webhook**, use URL `https://lifeos.vinnisantos.com.br/api/webhooks/asaas`, informe esse token em **Token de autenticação**, habilite eventos de cobrança e assinatura e deixe a fila ativa. Cole o mesmo valor em `ASAAS_WEBHOOK_TOKEN` na EC2. O header esperado é `asaas-access-token`.
3. Com uma conta de teste não master e acesso elegível, abra `/assinar`, informe CPF válido quando solicitado e inicie o checkout. Confirme o link de cobrança do mesmo ambiente; simule/efetue pagamento conforme o painel Asaas. Em **Integrações → Webhooks**, confirme entrega HTTP 200. No app, `GET /api/access` deve passar para `active`; uma reentrega do mesmo evento não deve duplicar o efeito. Teste atraso/cancelamento no ambiente apropriado e confira que uma conta `revoked` por master permanece revogada.
4. No `/admin`, configure o WhatsApp de suporte. Para `revoked`, a tela orienta contato com suporte porque o checkout retorna 403 por regra de acesso. Se a integração Asaas não estiver habilitada, configure `asaas_checkout_url` no painel master e libere pagamentos manualmente no `/admin`.

## 3. Google Agenda

1. Em **Google Cloud Console → seletor de projeto → Novo projeto**, crie o projeto. Em **APIs e serviços → Biblioteca**, busque **Google Calendar API** e clique **Ativar**.
2. Em **APIs e serviços → Tela de consentimento OAuth**, configure o app, domínio autorizado `vinnisantos.com.br`, contato de suporte e escopo `https://www.googleapis.com/auth/calendar.events`. Em modo **Testing**, inclua contas de teste; para produção, publique o app e conclua a verificação do escopo sensível quando o Google solicitar. Tokens de teste expiram em 7 dias.
3. Em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**, adicione a **URI de redirecionamento autorizada** `https://lifeos.vinnisantos.com.br/api/integrations/google/callback`. Copie ID e segredo para `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` na EC2.
4. Gere `GOOGLE_TOKEN_ENCRYPTION_KEY` com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` e guarde cópia segura. Sem a mesma chave, conexões já gravadas deixam de ser decifráveis.
5. Entre em `/lembretes`, conecte o Google, aceite o escopo, crie um lembrete de treino e verifique no Google Agenda um evento recorrente com aviso. Desconecte e confirme a remoção do evento. Teste reconexão se o Google devolver `invalid_grant`.

## 4. EC2 e publicação

1. Conecte por **AWS Systems Manager → Session Manager → Start session** à instância documentada em `docs/07-infraestrutura-deploy.md`. No servidor, use `/var/www/agenda-vinnisantos/.env.production` com todas as variáveis de `.env.example`; defina `APP_URL=https://lifeos.vinnisantos.com.br`. Restrinja o arquivo a quem opera o serviço (`chmod 600 .env.production`). Nunca envie o arquivo ou segredos para Git.
2. Confira `ss -tlnp | grep ':3002 '` antes de subir o serviço. O `docker-compose.yml` publica apenas `127.0.0.1:3002:3000`. Verifique no nginx o `server_name lifeos.vinnisantos.com.br` com `proxy_pass http://127.0.0.1:3002`; teste `sudo nginx -t`. Se o certificado ainda não estiver ativo, rode `sudo certbot --nginx -d lifeos.vinnisantos.com.br` e confirme HTTPS.
3. Após revisão e merge autorizado de `feat/saas-foundation` em `main`, aguarde **GitHub Actions → Build e publica imagem Docker**: `verify` e `build-and-push` devem ficar verdes e a imagem `ghcr.io/vinnisntos/app-vinnicius:latest` disponível. Não faça build na EC2 (memória compartilhada limitada).
4. Na EC2, rode separadamente `cd /var/www/agenda-vinnisantos`, `git pull`, `docker compose pull` e `docker compose up -d` (sem `--build`). Confira `docker compose ps`, `docker compose logs --tail=100 app`, `curl -I http://127.0.0.1:3002` e `curl -I https://lifeos.vinnisantos.com.br`. O HTTPS deve responder sem erro 5xx.

## 5. Revisão editorial e aceite final

1. Em `/faq`, leia as 23 respostas semeadas por `0006_seed_content.sql`. No **/admin → FAQ**, ajuste apenas textos que dependam da política comercial real (preço, cancelamento e suporte). Confirme que o WhatsApp abre o número configurado.
2. Em **/admin → Dicas / mentoria**, confira as 8 dicas semente. Despublique uma, recarregue e confirme o selo **Rascunho**; edite e republique. Em `/dicas`, só as publicadas devem aparecer. Revise textos médicos para preservar a regra: registrar prescrição, jamais sugerir dose.
3. Com duas contas comuns distintas, confira isolamento de refeições, medicação, medidas e comunidade. No navegador de uma delas, desligue a rede, adicione e remova um item de refeição e confirme **Pendente de envio**; religue a rede e confirme a sincronização. Confira que um POST repetido com o mesmo `id` não duplica item.
4. Confira login, confirmação/reset de senha, trial de três dias, paywall, checkout, webhook, lembrete Google, instalação PWA e responsividade 390×844. Registre evidência operacional (horário, ambiente e resultado) antes de abrir ao público.
