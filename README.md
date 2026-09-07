# agenda.vinnisantos.com.br — Life OS

Sistema pessoal de gestão de rotina de Vinnicius Santos: centraliza estudos, estágio,
treino, alimentação e finanças em um único painel diário.

> **Status:** em produção em `agenda.vinnisantos.com.br`. Fundação (Fase 1) e
> módulo **Alimentação** (Fase 2 — TDEE, refeições, água, peso) completos e
> testados ponta a ponta. Próximo: Treinos (ver
> [`docs/08-processo-desenvolvimento.md`](docs/08-processo-desenvolvimento.md#fases-de-implementação)).

## Módulos

| Módulo | Responsabilidade |
|---|---|
| **Dashboard** | Checklist diário consolidando os demais módulos |
| **Financeiro** | Fluxo de caixa: renda fixa (estágio), renda variável (corridas), despesas |
| **Treinos** | Tracker de calistenia (divisão AB) |
| **Alimentação** | TDEE, déficit calórico, checklist de refeições e água |
| **Estudos e Trabalhos** | Kanban de provas, trabalhos, estágio e projetos pessoais |

Acesso é privado, único usuário, protegido por login (Supabase Auth).

## Documentação

Leia nesta ordem:

1. [`docs/01-visao-geral.md`](docs/01-visao-geral.md) — objetivo, escopo, personas
2. [`docs/02-arquitetura.md`](docs/02-arquitetura.md) — stack, decisões, diagramas
3. [`docs/03-modelo-de-dados.md`](docs/03-modelo-de-dados.md) — schema Postgres/Supabase
4. [`docs/04-api-contratos.md`](docs/04-api-contratos.md) — contratos de server actions/rotas por módulo
5. [`docs/05-design-system.md`](docs/05-design-system.md) — tokens visuais (herdados de vinnisantos.com.br), componentes, UX
6. [`docs/06-seguranca.md`](docs/06-seguranca.md) — autenticação, RLS, segredos, hardening
7. [`docs/07-infraestrutura-deploy.md`](docs/07-infraestrutura-deploy.md) — AWS EC2, Docker, subdomínio
8. [`docs/08-processo-desenvolvimento.md`](docs/08-processo-desenvolvimento.md) — convenções, fases, Definition of Done
9. [`docs/adr/`](docs/adr) — Architecture Decision Records

## Stack (resumo)

Next.js 16 (App Router/TS) · Supabase (Postgres + Auth + RLS) · Drizzle ORM ·
Tailwind CSS v4 + shadcn/ui · Docker atrás do nginx compartilhado em AWS EC2,
imagem buildada no GitHub Actions ([ADR-0005](docs/adr/0005-build-fora-da-ec2.md)).

Justificativa completa em [`docs/adr/0001-escolha-de-stack.md`](docs/adr/0001-escolha-de-stack.md).

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com as credenciais do projeto Supabase
npm run dev
```

Antes do primeiro `npm run dev`, aplique o schema no projeto Supabase (painel
> SQL Editor, ou `supabase db push` se usar a CLI) executando o conteúdo de
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — é
o schema completo (tabelas, RLS, triggers de seed). Como não há tela de
cadastro (ver [ADR-0003](docs/adr/0003-autenticacao-supabase.md)), crie o
usuário manualmente em Authentication > Users no painel Supabase.

Outros scripts: `npm run build`, `npm run lint`, `npm run test` (Vitest —
hoje só as funções puras do módulo Alimentação), `npm run db:studio` (abre o
Drizzle Studio para inspecionar o banco).
