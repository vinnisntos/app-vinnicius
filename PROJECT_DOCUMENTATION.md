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
| 3 | UI mobile-first (Codex) | pendente |
| 4 | Asaas + Google Calendar | pendente |
| 5 | Comunidade + FAQ UI (Codex) | pendente |
| 6 | Revisão final / CI-CD | pendente |

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
