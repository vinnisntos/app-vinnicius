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

- **Lint:** ESLint (config Next.js) + Prettier, rodando em pre-commit (Husky +
  lint-staged) e em CI — nunca só um dos dois.
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

1. **Fundação:** projeto Next.js, Tailwind/shadcn temeado
   ([`05-design-system.md`](05-design-system.md)), Supabase (projeto +
   migrations iniciais: `profiles`, trigger de criação), Drizzle configurado,
   tela de login + middleware de proteção de rota, layout com navegação dos 5
   módulos (telas vazias).
2. **Alimentação** (módulo mais autocontido, valida o padrão de vertical
   slice ponta a ponta: schema → repository → action → UI).
3. **Treinos.**
4. **Financeiro.**
5. **Estudos e Trabalhos (Kanban)** — deixado para depois por ter a UI mais
   complexa (drag-and-drop).
6. **Dashboard** — por último de propósito: só depois de 2-5 existirem é que
   há dado real de cada módulo para compor a visão consolidada.
7. **Deploy em produção** ([`07-infraestrutura-deploy.md`](07-infraestrutura-
   deploy.md)) — feito assim que a Fundação + 1 módulo estiverem prontos, não
   só no final; validar infra cedo evita surpresa de deploy com o app inteiro
   pronto.

## Rastreamento de decisões

Toda decisão arquitetural não trivial (troca de lib, mudança de modelo de
dado com impacto em módulo já implementado, mudança de estratégia de deploy)
vira um novo arquivo em [`docs/adr/`](adr), curto (contexto → decisão →
consequência), nunca editado retroativamente — decisões supersedidas ganham um
novo ADR que referencia o anterior.
