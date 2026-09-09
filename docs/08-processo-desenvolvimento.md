# Processo de Desenvolvimento

## Convenções de código

- **TypeScript estrito** (`strict: true`), sem `any` implícito. Tipos de dado
  derivados do schema Drizzle (`$inferSelect`/`$inferInsert`) — nunca
  duplicados manualmente.
- **Zod como fonte única de validação** por módulo (`lib/modules/<módulo>/
  schema.ts`); o mesmo schema valida formulário no cliente e o input da server
  action no servidor.
- **Vertical slice por módulo**: `schema.ts` (Zod + tipos), `repository.ts`
  (Drizzle, uma função exportada por operação de leitura/escrita),
  `actions.ts` (`"use server"`, chama repository). Nenhum módulo importa o
  `repository.ts` de outro — comunicação entre módulos é só pelas funções
  públicas listadas em [`04-api-contratos.md`](04-api-contratos.md).
- **Server Components por padrão**; `"use client"` só quando há interatividade
  real (formulário, drag-and-drop do Kanban, gráfico). Regra prática: se o
  componente não usa `useState`/`useEffect`/evento de UI, ele não é client.
- **Sem comentário explicando o óbvio.** Nome de função/variável carrega o
  "o quê"; comentário só existe para uma decisão não óbvia (ex. por que BMR não
  é armazenado).
- Commits em português, imperativo curto (`adiciona checklist de refeições`,
  não `adicionado`/`adicionando`), granularidade de uma mudança coesa por
  commit.

## Qualidade

- **Lint:** ESLint (config Next.js). Roda manualmente (`npm run lint`) antes
  de cada commit — **ainda não há hook de pre-commit (Husky/lint-staged) nem
  job de CI rodando lint/typecheck/testes automaticamente**; o único workflow
  hoje (`.github/workflows/build-and-push.yml`) só builda e publica a imagem
  Docker. Adicionar esse gate é o próximo passo de qualidade mais óbvio —
  documentado aqui, não implementado ainda.
- **Testes:**
  - Unitário nas funções puras de regra de negócio (cálculo de TDEE/déficit,
    derivação do próximo dia de treino A/B, agregação de saldo mensal) — são as
    partes com lógica real, o resto é CRUD fino.
  - Integração leve nos repositories contra um banco Postgres de teste
    (container efêmero), garantindo que a RLS + queries Drizzle retornam o
    esperado por usuário.
  - Sem E2E automatizado na v1 (Playwright fica como próximo passo natural,
    não bloqueia o lançamento de um app de usuário único).
- **Definition of Done** de uma feature de módulo:
  1. Migration criada e commitada em `supabase/migrations/`.
  2. RLS habilitada e testada manualmente (tentar acessar dado de outro
     `user_id` via SQL direto, deve falhar).
  3. Schema Zod cobre todo campo de entrada, com mensagem de erro em
     português.
  4. Estados de carregando/vazio/erro implementados na tela (não só o caminho
     feliz).
  5. Visual conferido contra [`05-design-system.md`](05-design-system.md) —
     mesma paleta/tipografia/raio que o resto do app.
  6. Testado manualmente em mobile (viewport estreito) além de desktop.

## Fases de implementação

Ordem escolhida para ter, o quanto antes, um app **usável fim-a-fim** (login +
1 módulo completo) antes de espalhar esforço pelos outros módulos:

1. ✅ **Fundação** (2026-09-07) — projeto Next.js, Tailwind/shadcn temeado
   ([`05-design-system.md`](05-design-system.md)), Supabase (projeto
   `agenda-vinni` + migration `0001_init.sql`: schema completo dos 5
   módulos, RLS, triggers de seed), Drizzle configurado, tela de login +
   proxy de proteção de rota, layout com navegação dos 5 módulos.
2. ✅ **Alimentação** (2026-09-07) — vertical slice completo (schema →
   repository → server actions → UI): TDEE (Mifflin-St Jeor, com testes
   unitários), checklist de refeições, água e peso. Testado ponta a ponta
   contra o Supabase real, em produção.
3. ✅ **Treinos** (2026-09-09) — plano de calistenia AB (criação + editor de
   exercícios por dia), derivação automática do próximo dia (A/B, com
   testes unitários), registro de séries por sessão (upsert por
   sessão+exercício+série), histórico com volume calculado. Testado e em
   produção.
4. ✅ **Financeiro** (2026-09-09) — fluxo de caixa (receita fixa, variável,
   despesas), categorias filtradas por tipo (seedadas automaticamente na
   criação do usuário), transação recorrente, saldo do mês calculado
   (`computeMonthBalance`, com testes unitários incl. ano bissexto).
   Testado ponta a ponta contra o Supabase real.
5. ✅ **Estudos e Trabalhos (Kanban)** (2026-09-09) — colunas e cartões com
   categoria/prioridade/prazo, drag-and-drop entre colunas via `@dnd-kit`
   (reordenação testada com unidade em `reorderAfterMove`), reordenação de
   coluna por botões (mais simples e confiável que arrastar colunas, dado o
   ganho marginal frente à complexidade de contextos `dnd-kit` aninhados).
   Testado ponta a ponta contra o Supabase real.
6. ✅ **Dashboard** (2026-09-09) — `getDailyOverview()` compõe, via as
   funções públicas de cada módulo (nenhum select direto em tabela alheia),
   o dia de treino esperado + se já treinou, refeições/água de hoje,
   pendências do Kanban (atrasadas ou de hoje) e o saldo parcial do mês.
   Testado ponta a ponta contra o Supabase real.
7. ✅ **Deploy em produção** (2026-09-07) — `agenda.vinnisantos.com.br`, ver
   [`07-infraestrutura-deploy.md`](07-infraestrutura-deploy.md). Feito já na
   Fase 1, antes dos módulos restantes, como planejado: validar infra cedo
   evitou que a superfície de risco crescesse até o fim do projeto.
8. ✅ **Polimento pós-lançamento** (2026-09-09) — com os 5 módulos prontos:
   marca própria (`Logo`/`LogoMark`, favicon, ver
   [`05-design-system.md`](05-design-system.md#marca)); ações rápidas no
   Dashboard (marcar refeição, registrar água, nova transação) reusando as
   server actions dos módulos donos; repetição de transações recorrentes no
   Financeiro (`repeatRecurringTransactions`) para não reentrar renda
   fixa/despesas fixas todo mês manualmente.

**Pendências abertas conhecidas** (não bloqueiam o uso, mas valem registrar):
- Sem CI de lint/typecheck/testes (só o build+push da imagem) — ver seção
  Qualidade acima.
- Deploy na EC2 ainda é manual (`git pull && docker compose pull && up -d`
  via SSM) — automatizar o disparo a partir do GitHub Actions é o próximo
  passo natural, ver [ADR-0005](adr/0005-build-fora-da-ec2.md).

## Rastreamento de decisões

Toda decisão arquitetural não trivial (troca de lib, mudança de modelo de
dado com impacto em módulo já implementado, mudança de estratégia de deploy)
vira um novo arquivo em [`docs/adr/`](adr), curto (contexto → decisão →
consequência), nunca editado retroativamente — decisões supersedidas ganham um
novo ADR que referencia o anterior.
