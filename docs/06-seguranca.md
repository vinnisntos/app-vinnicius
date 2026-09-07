# Segurança

App de usuário único, mas guardando dado sensível (saúde, finanças) — tratado
com o mesmo rigor de um app multiusuário.

## Autenticação

- **Supabase Auth**, e-mail/senha. Sessão gerenciada via `@supabase/ssr`, cookies
  **httpOnly + Secure + SameSite=Lax** — o token de sessão nunca é acessível via
  JavaScript do navegador (mitiga roubo de sessão por XSS).
- **Sign-up desabilitado na UI.** A única conta é criada uma vez, manualmente,
  via Supabase Studio (ou script de seed rodado localmente com a service-role
  key, nunca commitado). Não existe rota `/signup` nem endpoint que crie
  usuário a partir de request externo.
- Erros de login são genéricos ("e-mail ou senha inválidos") — não revelam se o
  e-mail existe.
- Rate limit de tentativas de login usa o rate limit nativo do Supabase Auth;
  reforçar com rate limit por IP no Caddy (`rate_limit` do módulo, ou
  `fail2ban` na instância) se abuso for observado nos logs.
- `middleware.ts` do Next.js bloqueia toda rota fora de `/login` sem sessão
  válida — redirecionamento acontece no servidor, antes de qualquer render.

## Autorização / isolamento de dado

- **RLS habilitada em 100% das tabelas de domínio**, policy `auth.uid() =
  user_id` para select/insert/update/delete (ver [`03-modelo-de-
  dados.md`](03-modelo-de-dados.md)). Mesmo com um usuário só, isso é a rede de
  segurança contra bug de aplicação — e deixa o schema pronto para um segundo
  usuário sem redesenho.
- A aplicação Next.js só usa a **anon key** do Supabase em qualquer código que
  possa chegar ao cliente. A **service-role key** (que ignora RLS) só é lida em
  código server-only (nunca em Client Component, nunca em código importado por
  um) e reservada para a rotina de seed/manutenção pontual — não para o
  runtime normal do app, que deve operar autenticado como o próprio usuário.
- **Nuance importante sobre a via Drizzle:** o runtime normal do app não fala
  com o Postgres via PostgREST (onde `auth.uid()` é populado a partir do JWT
  automaticamente) — fala via `DATABASE_URL` direta (Drizzle/`postgres-js`).
  Nessa via, a sessão SQL não carrega o JWT do usuário, então a policy de RLS
  não é reavaliada por usuário. Isolamento nesse caminho é garantido na
  **camada de aplicação**: todo repository exige `userId` como primeiro
  parâmetro, resolvido em um único ponto (`requireUserId()`, em
  `lib/auth/session.ts`) a partir da sessão Supabase Auth — nunca opcional,
  nunca hardcoded, nunca lido do payload do cliente. RLS continua habilitada
  em 100% das tabelas como defesa em profundidade para o caminho
  supabase-js/anon key (ex.: se algum código futuro passar a usar Realtime ou
  chamar o Supabase client direto do navegador) — não é redundante, é uma
  camada diferente cobrindo um vetor diferente.

## Segredos

- Nenhum segredo commitado. `.env.local` (dev) e `.env.production` (só na
  instância EC2, fora do controle de versão) contêm `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `DATABASE_URL` (para Drizzle migrations).
- `.gitignore` cobre `.env*` (exceto `.env.example`, que documenta as chaves
  sem valores).
- Rotação: se qualquer chave vazar (ex. commit acidental), regenerar
  imediatamente no painel Supabase — invalida a anterior.

## Validação e superfícies de entrada

- Toda entrada de usuário (formulários → server actions) passa por schema Zod
  antes de tocar o banco — cobre os dois vetores principais para este app:
  injeção via campos de texto (descrição de transação/cartão) e valores fora de
  domínio (ex. `amount` negativo, `meal_slot` inválido).
- Drizzle usa queries parametrizadas por padrão — sem concatenação de SQL em
  nenhum ponto do código (regra de code review, não só confiança na lib).
- Sem upload de arquivo na v1 (sem avatar customizado, sem anexo em cartão do
  Kanban) — remove uma superfície de ataque inteira (upload malicioso) sem
  necessidade de mitigá-la agora.

## Transporte e infraestrutura

- TLS obrigatório em produção — nginx + Certbot providenciam o certificado
  Let's Encrypt para `agenda.vinnisantos.com.br` e forçam redirect HTTP→HTTPS
  (ver [ADR-0004](adr/0004-nginx-compartilhado-em-vez-de-caddy.md)).
- Headers de segurança estáticos configurados no Next.js (`next.config.ts`):
  `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY` (o app não precisa ser embutido em iframe),
  `Referrer-Policy: strict-origin-when-cross-origin`.
- **`Content-Security-Policy` vem do proxy (`src/proxy.ts`), não do
  `next.config.ts`** — precisa ser gerada por request porque usa um nonce
  aleatório em `script-src`. O Next.js injeta um `<script>` inline no HTML
  para o próprio bootstrap do cliente (define `window.__next_r`); sem o
  nonce, esse script cai sob a CSP como qualquer outro inline script e é
  bloqueado — e como ele roda antes da hidratação, **o app inteiro fica
  não-interativo, em silêncio, sem nenhum erro de aplicação óbvio no
  console** (só um aviso de CSP, fácil de não notar). O proxy gera um nonce
  por request, injeta como `'nonce-<valor>'` em `script-src` e repassa via
  `x-nonce`/header da própria CSP nos headers do request encaminhado — é
  assim que o Next.js sabe qual nonce usar ao renderizar. Em dev, `script-src`
  também precisa de `'unsafe-eval'` (Fast Refresh do Turbopack/webpack usa
  `eval()`), condicionado a `NODE_ENV !== 'production'`.
- Porta do container Next.js **não exposta diretamente** na internet — só o
  nginx do host escuta 80/443 publicamente; o app escuta em
  `127.0.0.1:<porta>`, só alcançável pelo próprio host (ver
  [`07-infraestrutura-deploy.md`](07-infraestrutura-deploy.md)).
- Atualizações de dependências: `npm audit`/Dependabot habilitado no repositório
  GitHub, revisão manual de PRs de atualização antes de merge.

## Backups

- Backups automáticos do Postgres ficam a cargo do plano Supabase contratado —
  confirmar frequência/retenção no painel do projeto ao provisionar (não
  assumir; documentar aqui assim que confirmado).
- Sem backup adicional customizado na v1 — risco aceito e revisitado se o
  volume de dado histórico (treino, financeiro) crescer o suficiente para
  justificar um `pg_dump` agendado à parte.
