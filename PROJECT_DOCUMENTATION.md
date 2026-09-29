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
| 2 | Auth, trial/paywall, painel master | pendente |
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
