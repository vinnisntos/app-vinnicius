# Project Documentation — Life OS → SaaS de Saúde

Registro vivo do pivot do Life OS (app pessoal) para um SaaS mobile-first/PWA
de saúde, emagrecimento e comunidade. Atualizado ao fim de cada fase.
Documentação de base (arquitetura, segurança, deploy) continua em `docs/`.

> Stack real: **Next.js 16.3** (não 15), React 19, Tailwind v4, Supabase
> (Postgres + Auth), Drizzle ORM, Zod 4. Ler `node_modules/next/dist/docs/`
> antes de escrever código Next (ver `AGENTS.md`).

| Fase | Escopo | Status |
|---|---|---|
| 1 | Data layer, API foundation, PWA | ✅ concluída |
| 2 | Auth, trial/paywall, painel master | ✅ concluída |
| 3 | UI mobile-first (Codex) | ✅ concluída |
| 4 | Asaas + Google Calendar | ✅ concluída |
| 5 | Comunidade + FAQ UI (Codex) | ✅ concluída |
| 6 | Revisão final / CI-CD | ✅ concluída (deploy pendente de config manual) |

---

## Fase 1 — Data layer, API foundation, PWA

### Migrations aplicadas no Supabase (`agenda-vinni`, ref `twjrojtdhkbdodtfebbu`)

| Migration | Conteúdo |
|---|---|
| `0003_saas_foundation.sql` | `profiles.role/email/phone`, `subscriptions`, `app_settings`, `posts`, `post_reactions`, `faq_items`, `help_tooltips`, macros em `meal_logs`, `goal` em `nutrition_profile`, RLS completa, `get_access_status()` |
| `0004_integrations_and_nag.sql` | `show_nag_screen` também para trial expirado/revogado; `asaas_webhook_events`, `google_calendar_connections`, `calendar_reminders` |

Ambas validadas antes de aplicar com uma suíte de 36 asserções de RLS em
Postgres (PGlite) com stub do schema `auth`: escalada de papel, isolamento
entre usuários, feed público, moderação, paywall, tokens invisíveis via
PostgREST.

### Modelo de acesso

| Papel | Vê/edita |
|---|---|
| `user` | Os próprios dados; posts públicos (não ocultos) da comunidade e as refeições anexadas a eles; FAQ/tooltips/settings |
| `master` | Tudo (`master_full_access` em todas as tabelas) |
| `anon` | FAQ publicado, tooltips, settings públicos |

Proteções que não dependem da UI:
- Trigger impede `user` de alterar `role`/`email` do próprio perfil; `user`
  não pode inserir nem apagar `profiles` (fechava o vetor delete + reinsert
  como master).
- Colunas de moderação de `posts` (`is_hidden`, `hidden_reason`) só master.
- `subscriptions` só leitura para o dono; escrita só master/service role.
- `google_calendar_connections` sem policy nenhuma: token nunca sai por
  PostgREST.

> ⚠️ **RLS não protege a via Drizzle.** O app fala com o Postgres como
> `postgres` (ignora RLS). Na via Drizzle, isolamento e paywall são
> garantidos pelo `apiRoute` + `userId` da sessão em todo repository (ver
> `docs/06-seguranca.md`). RLS é defesa em profundidade para supabase-js.

### Paywall — `get_access_status(user_id)`

Fonte única, em SQL. `src/lib/access/status.ts` só a chama.

| `access_state` | `has_access` | `show_nag_screen` | UI esperada |
|---|---|---|---|
| `master` | ✅ | ❌ | normal |
| `active` | ✅ | ❌ | normal |
| `trial` | ✅ | ✅ | nag **dispensável** (banners/pop-ups de escassez) |
| `expired` | ❌ | ✅ | paywall **bloqueante** |
| `revoked` | ❌ | ✅ | paywall bloqueante |

Trial = `auth.users.created_at + app_settings.trial_days` (padrão 3),
gravado em `subscriptions.trial_ends_at` pelo trigger de signup (o master
pode estender). `server_now` vem junto para o countdown não depender do
relógio do aparelho.

### Contrato de tipos

- `src/types/database.ts` — contrato snake_case consumido pelo front
  (linhas de tabela, enums como arrays `as const` para `z.enum`, payloads
  compostos das rotas, `ApiEnvelope`, `ApiError`).
- `src/lib/db/schema/*` — espelho Drizzle (camelCase) para o server.
- `src/lib/api/mappers.ts` — conversão Drizzle → contrato (numeric → number,
  Date → ISO).

### API foundation — `src/lib/api/handler.ts`

Toda rota em `src/app/api/**/route.ts` usa `apiRoute({ guard }, handler)`:

| guard | Exige | Falha |
|---|---|---|
| `public` | nada | — |
| `user` | sessão | 401 `unauthorized` |
| `access` | sessão + `has_access` | 402 `paywall` |
| `master` | sessão + role master | 403 `forbidden` |

Resposta de sucesso: `{ data, access, help? }` (`ApiEnvelope<T>`), sempre
`Cache-Control: no-store`. Erro: `{ error: { code, message, fields? } }`.
Zod inválido → 422 com `fields` por campo. O proxy não redireciona `/api/*`
para `/login` — o handler responde JSON.

### Rotas da Fase 1

| Método | Rota | Guard | Retorno (`data`) |
|---|---|---|---|
| GET | `/api/me` | user | `MeResponse` |
| PATCH | `/api/me` | user | `ProfileRow` (body: `full_name`, `avatar_url`, `timezone`, `phone`) |
| GET | `/api/access` | user | `AccessStatus` (+ help `route.assinar`) |
| GET | `/api/help?keys=a.b,c.d` | public | `Partial<HelpTooltipMap>` |
| GET | `/api/faq` | public | `{ items: FaqItemRow[], support_whatsapp_url }` |
| GET | `/api/settings` | public | `PublicSettings` |

### PWA

- `src/app/manifest.ts` → `/manifest.webmanifest` (standalone, portrait,
  atalhos para Alimentação e Comunidade).
- `src/app/pwa-icon/[size]/route.tsx` → ícones PNG 192/512 (+ `?maskable=1`)
  gerados via `ImageResponse` a partir do LogoMark — sem binário no repo.
- `public/sw.js` — cache-first só para assets versionados; navegação
  network-first com fallback `/offline`; **nunca** cacheia HTML autenticado
  nem `/api/*`.
- `ServiceWorkerRegister` no root layout (só em produção).
- `appleWebApp` + `viewport-fit=cover` para standalone no iOS.
- Identidade do produto centralizada em `src/lib/app-config.ts`.

---

## Fase 2 — Auth, trial/paywall, painel master

### Fluxo de autenticação

| Etapa | Implementação |
|---|---|
| Cadastro | Server Action `signUp` (`src/lib/auth/actions.ts`) — Zod: nome, e-mail (com `@`), celular opcional (só dígitos), senha ≥ 8. `full_name`/`phone` vão em `user_metadata` e o trigger `handle_new_user` cria profile + subscription com trial. |
| Confirmação de e-mail | Obrigatória (config do projeto Supabase). Link → `GET /auth/confirm` aceita `?code=` (PKCE) e `?token_hash=&type=`; destino só caminho interno (`safeNextPath`, bloqueia open redirect). |
| Login | `signIn` existente (`src/app/(auth)/login/actions.ts`), mensagem genérica. |
| Esqueci a senha | `requestPasswordReset` — resposta sempre igual (não revela se o e-mail existe). Link → `/auth/confirm` → `/redefinir-senha`. |
| Nova senha | `updatePassword` — usa a sessão de recuperação. |
| Sair | `signOut`. |

Estado dos formulários: `AuthFormState = { error?, fields?, success? }`
(para `useActionState`).

**Configuração manual no painel Supabase (Authentication → URL
Configuration):** Site URL = `https://lifeos.vinnisantos.com.br`; Redirect
URLs incluir `https://lifeos.vinnisantos.com.br/auth/confirm` e
`http://localhost:3000/auth/confirm`. Env `APP_URL` em produção.

### Paywall nas páginas

- `(dashboard)/layout.tsx` chama `requireAppAccess()` → sem acesso
  redireciona para `/assinar` (fora do grupo protegido). Redirect em vez de
  modal por cima porque as páginas buscam dado no server — renderizar por
  baixo do modal entregaria conteúdo pago no HTML.
- `AccessProvider` / `useAccess()` (`src/components/access/access-provider.tsx`)
  expõe `{ access, role, nagMode, countdown, refresh }` para qualquer client
  component. Atualiza sozinho a cada resposta de `apiFetch` e força refresh
  em qualquer 402.
- `src/lib/access/nag.ts` (puro, testado):
  - `getNagMode(access)` → `none | soft | blocking`
  - `getTrialCountdown(access, receivedAt, now)` — usa `server_now`, imune a
    relógio errado do aparelho
  - `shouldShowNagPopup(mode, countdown, lastShownAt, now)` — 1x a cada 6h
    no trial, a cada 10 min no último dia, sempre se bloqueante
- `src/lib/api/client.ts`: `apiFetch`/`apiData` (desembrulham envelope,
  lançam `ApiClientError`), `newClientId()` para writes otimistas.

### Papéis na navegação

`NAV_ITEMS[].masterOnly` — Admin, Financeiro e Estudos e Trabalhos só para
master (menu **e** rota: `requireMasterPage` responde 404). Os cards de
Kanban/Financeiro do Dashboard também só aparecem para master.

### Painel master — rotas (`guard: "master"`)

Estrutura reaproveitada do módulo Financeiro (`schema.ts` Zod +
`repository.ts` + rotas finas): `src/lib/modules/admin/`.

| Método | Rota | Body / query | Retorno |
|---|---|---|---|
| GET | `/api/admin/subscriptions` | `?state=trial&q=&page=1&page_size=30` | `{ items: AdminSubscriptionItem[], total, page, page_size }` |
| PATCH | `/api/admin/subscriptions/:userId` | `AdminSubscriptionAction` (`approve`, `revoke`, `extend_trial` + `days`, `set_notes`) | `SubscriptionRow` |
| GET | `/api/admin/overview` | — | `Record<AccessState, number>` |
| GET/PATCH | `/api/admin/settings` | `trial_days`, `support_whatsapp`, `support_whatsapp_message`, `asaas_checkout_url` | `AppSettingsRow` |
| GET/POST | `/api/admin/faq` | `question`, `answer`, `category`, `order_index`, `is_published` | `FaqItemRow[]` / `FaqItemRow` (201) |
| PATCH/DELETE | `/api/admin/faq/:id` | parcial | `FaqItemRow` / `{ deleted }` |
| PUT | `/api/admin/help/:key` | `title`, `body`, `faq_item_id` | tooltip |
| PATCH | `/api/admin/posts/:id` | `is_hidden`, `hidden_reason`, `visibility` | `PostRow` |

`access_state` da listagem vem da mesma `get_access_status` (lateral join) —
o painel nunca diverge do que o assinante vive.

### Alimentação — rotas (`guard: "access"`)

Preparadas nesta fase para a UI da Fase 3.

| Método | Rota | Body / query | Retorno |
|---|---|---|---|
| GET | `/api/nutrition/day` | `?date=YYYY-MM-DD` (default: hoje no fuso do usuário) | `NutritionDay` (+ help `metric.tdee`, `metric.bmr`, `meal_logs.calories`, `water_logs.amount_ml`) |
| GET/PUT | `/api/nutrition/profile` | `sex`, `birth_date`, `height_cm`, `activity_level`, `goal`, `target_weight_kg`, `calorie_goal`, `water_goal_ml` | `NutritionProfileRow \| null` |
| PUT | `/api/nutrition/meals` | `MealLogUpsert` ou lote (≤ 20) | `MealLogRow[]` |
| POST | `/api/nutrition/water` | `WaterLogInsert` | `WaterLogRow` (201; 200 em retry) |
| DELETE | `/api/nutrition/water/:id` | — | `{ deleted }` |
| POST | `/api/nutrition/weight` | `logged_at`, `weight_kg` | `WeightLogRow` |

Cálculo (`src/lib/modules/alimentacao/calculations.ts`, testado):
Mifflin-St Jeor → TDEE (fator de atividade) → recomendado = TDEE × 0,8
(emagrecer) / 1,0 (manter) / 1,1 (ganhar), arredondado a 10 kcal, **nunca
abaixo de 1200 kcal (F) / 1500 kcal (M)**. `remaining_kcal` negativo =
excedeu.

Idempotência para cache otimista: `id` gerado no cliente; refeição faz
upsert por (dia, slot) e reenvio preserva `completed_at` original; água
repetida devolve 200 sem duplicar; id de outro usuário → 409 sem vazar.

### Verificação

- 47 testes unitários (Vitest).
- 42 asserções E2E contra o Supabase real + `next dev` (usuários
  temporários via Admin API, apagados ao fim): 401/402/403/404/409/422,
  escalada de role bloqueada, paywall de página e de API, aprovação,
  revogação e extensão de trial, métricas numéricas, idempotência, settings
  e wa.me, FAQ, PWA sem sessão.

---

## Fase 3 — UI mobile-first (Codex)

Delegada ao Codex via Orca (`run_0c6665bd60fc`, task `task_44f7586ea7b7`).
Relatório do worker: `docs/phase-3-ui-report.md`. Revisão do coordenador:
typecheck/lint/testes/build reexecutados de forma independente; três
correções (fila offline por usuário, `/assinar` para revogado, trial_days
dinâmico) enviadas junto com a Fase 5.

Incidente de handoff: o Codex CLI 0.154 travava na tela "Update available"
ao iniciar (o Orca bloqueia input em prompt de agente por segurança). Após
decisão do usuário, atualizado para 0.159.1 e o dispatch foi reenviado com
`--retry-of`.

---

## Fase 4 — Integrações de custo zero

### Asaas (pagamentos)

Fluxo: `/assinar` → `POST /api/billing/checkout` → página de pagamento do
Asaas (Pix/boleto/cartão, `billingType: UNDEFINED`) → Asaas chama
`POST /api/webhooks/asaas` → `subscriptions.status` muda → paywall libera.
**O acesso nunca é liberado no checkout, só pelo webhook.**

| Método | Rota | Guard | Contrato |
|---|---|---|---|
| POST | `/api/billing/checkout` | user | body `CheckoutRequest` `{ cpf? }` → `CheckoutResponse` `{ checkout_url }` · 409 já ativo · 403 revogado · 422 `fields.cpf` · 502 provedor |
| POST | `/api/webhooks/asaas` | header `asaas-access-token` | 200 persistido · 401 token · 500 falha transitória (Asaas reenvia) · 503 sem token configurado |

Checkout (`src/lib/modules/billing/service.ts`):
- CPF exigido só na 1ª vez (Asaas exige para criar cliente), validado por
  dígito verificador e **não armazenado** — só o `asaas_customer_id`.
- Duas transações curtas com `SELECT … FOR UPDATE`: cliques concorrentes
  não criam duas assinaturas, e falha na 2ª etapa não perde o cliente
  criado na 1ª.
- Reaproveita cobrança em aberto de tentativa anterior.
- Sem `ASAAS_API_KEY`/`ASAAS_PLAN_VALUE` → devolve o link fixo
  `app_settings.asaas_checkout_url` (liberação manual pelo master).

Webhook (`src/lib/integrations/asaas/events.ts` puro + service):
- Comparação do token em tempo constante (sha256 + `timingSafeEqual`).
- Idempotente pelo id do evento (`asaas_webhook_events`, PK): reentrega
  processada = no-op; evento que falhou é reprocessado.
- Usuário resolvido por assinatura Asaas → cliente Asaas →
  `externalReference` (= userId).

| Evento | Efeito |
|---|---|
| `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED` | `active`, `current_period_end` = vencimento + 1 mês |
| `PAYMENT_OVERDUE` | `past_due` (só se for a assinatura Asaas atual) |
| `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`, `SUBSCRIPTION_DELETED`, `SUBSCRIPTION_INACTIVATED` | `canceled` (só assinatura atual) |
| demais | ignorado (registrado) |

`revoked` (decisão do master) **nunca** é sobrescrito por webhook.

**Configuração no painel Asaas:** Integrações → Webhooks → URL
`https://lifeos.vinnisantos.com.br/api/webhooks/asaas`, token =
`ASAAS_WEBHOOK_TOKEN`, eventos de Cobrança e Assinatura, fila ativa.

### Google Calendar (lembretes sem servidor de push)

Um **evento recorrente** (RRULE semanal) com alerta popup no horário, na
agenda do próprio usuário: o app do Google Agenda notifica o celular para
sempre, sem cron nem push pago do nosso lado.

| Método | Rota | Guard | Contrato |
|---|---|---|---|
| GET | `/api/integrations/google` | access | `GoogleCalendarStatus` |
| DELETE | `/api/integrations/google` | user | apaga eventos, revoga token, desconecta |
| GET | `/api/integrations/google/connect` | access | redirect OAuth (usar como **link**, não fetch/form) |
| GET | `/api/integrations/google/callback` | user | redirect `/lembretes?google=connected` ou `?google=erro&motivo=` |
| GET | `/api/reminders` | access | `RemindersResponse` |
| PUT | `/api/reminders/:kind` | access | `CalendarReminderUpsert` → `CalendarReminderRow` (502 = salvo sem sincronizar; 409 = reconectar) |
| DELETE | `/api/reminders/:kind` | access | `{ deleted }` |

Segurança do OAuth: Authorization Code + **PKCE**, `state` em cookie
httpOnly amarrado ao `userId` (o callback recusa se a sessão for de outro
usuário — impede ligar a agenda de terceiros à conta da vítima). Escopo
mínimo `calendar.events`. Refresh token cifrado com **AES-256-GCM**
(`GOOGLE_TOKEN_ENCRYPTION_KEY`), tabela sem policy RLS. `invalid_grant` →
conexão apagada e 409 pedindo reconexão.

Pendências de configuração (Google Cloud Console): criar projeto, ativar
Calendar API, tela de consentimento OAuth e credencial "Aplicativo da Web"
com o redirect URI acima. **Em modo "Testing" o Google expira refresh
tokens em 7 dias e limita a 100 usuários de teste** — para produção é
preciso publicar o app (escopo sensível `calendar.events` passa por
verificação do Google, gratuita).

### Verificação

- 26 testes novos (CPF, AES-GCM incl. adulteração, mapeamento de eventos,
  RRULE/próxima ocorrência/fuso) — 73 no total.
- 44 asserções E2E contra o Supabase real: webhook (auth, idempotência,
  assinatura antiga, past_due, revogado não reativa, evento informativo,
  cliente desconhecido, payload inválido), checkout (fallback de link, CPF
  inválido, master 409), lembretes (sem Google, validação, paywall),
  OAuth (sem configuração, callback sem state), comunidade (abaixo).

---

## Fase 5 — Backend da comunidade

Preparado antes do handoff da UI.

| Método | Rota | Guard | Contrato |
|---|---|---|---|
| GET | `/api/community/feed?cursor=&scope=community\|mine` | access | `FeedPage` (20 por página, cursor por `(created_at, id)`) |
| POST | `/api/community/posts` | access | `PostInsert` → `FeedPost` (201; idempotente por `id`) · 422 sem conteúdo/refeição alheia · 429 `rate_limited` (20/24h) |
| DELETE | `/api/community/posts/:id` | access | autor (ou master) |
| PUT/DELETE | `/api/community/posts/:id/reaction` | access | `{ kind }` → `FeedPost` |

Como a via Drizzle ignora RLS, a regra de visibilidade da policy
`community_or_owner_select` é reimplementada explicitamente em
`src/lib/modules/comunidade/repository.ts` (`visibleTo`). Motivo de
moderação visível só para master e autor.

### UI da Fase 5 (Codex)

Delegada ao mesmo terminal Codex da Fase 3 (`task_44070d0f67dc`);
relatório em `docs/phase-5-ui-report.md`. Telas: `/comunidade`, `/faq`
(pública), `/lembretes`, gestão de FAQ no `/admin`, checkout com CPF
progressivo. Incluiu as correções da revisão da Fase 3 — a mais importante:
a fila offline de refeições era global no `localStorage` e, num aparelho
compartilhado, gravaria refeições de uma conta em outra; agora é por
usuário e itens rejeitados (4xx) são descartados.

---

## Fase 6 — Revisão final e prontidão de CI/CD

### Verificação final (código integrado, branch `feat/saas-foundation`)

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` | ✅ sem erros |
| `eslint src` | ✅ sem erros |
| Vitest | ✅ 73 testes |
| `next build` (Next 16.3.4) | ✅ |
| RLS (PGlite, stub de `auth`) | ✅ 36 asserções |
| E2E contra Supabase real | ✅ 93 asserções (usuários temporários, limpos ao fim) |

### Variáveis de ambiente

Todas as 12 variáveis lidas pelo código estão documentadas em
`.env.example`. Integrações degradam com segurança quando ausentes:
sem Asaas → link fixo + liberação manual; sem Google → UI mostra
"indisponível"; sem `ASAAS_WEBHOOK_TOKEN` → webhook responde 503.

`NEXT_PUBLIC_*` só é inlinado no build se definido; o build do GitHub
Actions não tem essas variáveis, então o servidor as lê em runtime. **Não
use `NEXT_PUBLIC_*` em Client Components** sem passar build args ao
Docker — hoje nenhum Client Component usa.

### Pipeline

`.github/workflows/build-and-push.yml`: job `verify` (typegen, tsc,
eslint, vitest) em PR e push na `main`; `build-and-push` só publica a
imagem no GHCR se `verify` passar. Deploy na EC2 continua manual
(`docker compose pull && docker compose up -d`, nunca `--build` — ver
ADR-0005).

### Checklist de deploy (ações humanas)

1. **Promover o master** (senão seu usuário cai no paywall — o trial dele
   venceu em 10/09):
   `update public.profiles set role = 'master' where email = '<seu-email>';`
2. **Supabase → Authentication → URL Configuration:** Site URL
   `https://lifeos.vinnisantos.com.br`; Redirect URLs com
   `https://lifeos.vinnisantos.com.br/auth/confirm`.
3. **`.env.production` na EC2:** adicionar `APP_URL`, `ASAAS_*`,
   `GOOGLE_*` (ver `.env.example`). Gerar `GOOGLE_TOKEN_ENCRYPTION_KEY`
   com o comando documentado. **Guardar essa chave**: perdê-la invalida
   todas as conexões Google.
4. **Asaas:** criar a conta, gerar a API key (começar em sandbox), cadastrar
   o webhook `https://lifeos.vinnisantos.com.br/api/webhooks/asaas` com o
   mesmo token de `ASAAS_WEBHOOK_TOKEN`.
5. **Google Cloud:** projeto + Calendar API + tela de consentimento +
   credencial OAuth Web com redirect
   `https://lifeos.vinnisantos.com.br/api/integrations/google/callback`.
   Publicar o app (em "Testing" os tokens expiram em 7 dias).
6. **Merge** `feat/saas-foundation` → `main` (dispara verify + build da
   imagem) e `docker compose pull && docker compose up -d` na EC2.
7. **No `/admin`:** configurar WhatsApp de suporte, dias de trial e,
   opcionalmente, link fixo de checkout; cadastrar perguntas do FAQ.

### Estado do banco de produção

As migrations 0003 e 0004 **já estão aplicadas** no Supabase de produção.
São aditivas e compatíveis com a versão do app hoje no ar (que fala com o
banco via Drizzle e não depende das policies alteradas).

### Pendências conhecidas (fora do escopo destas fases)

- `seed_user_defaults` ainda cria colunas de Kanban e categorias do
  Financeiro para cada novo assinante (módulos legados, só master os vê).
- O Dashboard `/` ainda usa os cards legados (treino/nutrição via Server
  Actions); não foi redesenhado.
- Webhook do Asaas não ordena eventos fora de ordem por `dateCreated`
  (o Asaas entrega em ordem na prática; `revoked` é sempre preservado).
- Tracking de peptídeos, citado no briefing de contexto, não fazia parte
  das fases definidas e não foi modelado.
