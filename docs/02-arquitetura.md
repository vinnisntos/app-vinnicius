# Arquitetura

## Stack

| Camada | Escolha | Motivo (resumo — detalhes em `adr/`) |
|---|---|---|
| Frontend + Backend | **Next.js 15** (App Router, TypeScript, Server Components + Server Actions) | Um único deployable, um único runtime, menos superfície de ataque para um app de usuário único. Ver [ADR-0002](adr/0002-nextjs-como-backend.md). |
| Banco de dados | **Supabase Postgres** (obrigatório) | Postgres gerenciado, RLS nativo, Auth integrado. |
| Autenticação | **Supabase Auth** (e-mail/senha, sign-up desabilitado) | Ver [ADR-0003](adr/0003-autenticacao-supabase.md). |
| ORM / migrations | **Drizzle ORM** + `drizzle-kit` | Queries tipadas ponta a ponta, migrations versionadas como SQL, sem magia de ORM pesado. |
| Validação | **Zod** | Única fonte de verdade de schema em cada boundary (formulário → server action → banco). |
| UI | **Tailwind CSS v4 + shadcn/ui (Radix)** | Acessível por padrão (Radix), tokens de design fáceis de portar do site atual. Ver [`05-design-system.md`](05-design-system.md). |
| Infra | **Docker + Caddy** em **AWS EC2** | Caddy resolve TLS automático (Let's Encrypt) para `agenda.vinnisantos.com.br` sem config manual de certificado. |
| CI | **GitHub Actions** | Lint + typecheck + testes + build de imagem em cada PR. |

Stack **não** usada, e por quê: sem backend C#/.NET separado (documentado no
ADR-0002 — não é proibido, mas desnecessário: adicionaria um segundo runtime, um
segundo deploy e uma segunda superfície de auth para um domínio de app que não
exige processamento pesado). Sem microsserviços — é um app pessoal, um monólito
bem dividido em módulos é mais fácil de manter sozinho.

## Visão de componentes

```mermaid
flowchart TB
    subgraph Client["Navegador (agenda.vinnisantos.com.br)"]
        UI["Next.js App Router\nReact Server + Client Components"]
    end

    subgraph EC2["AWS EC2 — instância única"]
        Caddy["Caddy\n(reverse proxy + TLS automático)"]
        App["Container Next.js\n(server actions = camada de API)"]
    end

    subgraph Supabase["Supabase (gerenciado)"]
        Auth["Supabase Auth"]
        DB[("Postgres\ncom RLS por user_id")]
    end

    UI -->|HTTPS| Caddy --> App
    App -->|"service-role key\n(server-only)"| DB
    App -->|"verifica sessão"| Auth
    UI -.->|"login/refresh de sessão\n(cookies httpOnly via @supabase/ssr)"| Auth
```

## Por que Next.js "é" o backend

Não existe uma API REST/GraphQL separada. A camada de acesso a dados vive dentro
do próprio Next.js, em três fatias:

```mermaid
flowchart LR
    subgraph "app/(módulo)/page.tsx"
        RSC["Server Component\n(leitura: chama repository direto)"]
    end
    subgraph "app/(módulo)/actions.ts"
        SA["Server Action\n(escrita: valida com Zod → chama repository)"]
    end
    subgraph "lib/modules/(módulo)"
        Repo["Repository\n(Drizzle queries, uma função por operação)"]
    end
    RSC --> Repo
    SA --> Repo
    Repo --> DB[("Postgres/Supabase")]
```

Regra fixa: **nenhum Client Component fala com o banco diretamente**. Toda leitura
passa por Server Component (ou Route Handler quando precisa ser chamado via
`fetch`/polling do cliente); toda escrita passa por Server Action. Isso mantém a
`SUPABASE_SERVICE_ROLE_KEY` inteiramente fora do bundle do navegador.

## Estrutura de pastas (alvo, para quando a implementação começar)

```
app-vinnicius/
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx                 # Dashboard
│   │   │   ├── financeiro/
│   │   │   ├── treinos/
│   │   │   ├── alimentacao/
│   │   │   └── estudos-trabalhos/
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── supabase/                    # clients (server/browser/middleware)
│   │   ├── db/                          # drizzle schema + client
│   │   └── modules/
│   │       ├── financeiro/{repository,actions,schema}.ts
│   │       ├── treinos/...
│   │       ├── alimentacao/...
│   │       └── kanban/...
│   ├── components/
│   │   ├── ui/                          # shadcn/ui primitives
│   │   └── (módulo)/                    # composições específicas de módulo
│   └── proxy.ts                         # redireciona não-autenticado -> /login
│                                         # (renomeado de middleware.ts no Next.js 16)
├── supabase/
│   └── migrations/                      # SQL versionado (fonte de verdade do schema)
├── docs/
└── docker/
```

Cada módulo (`financeiro`, `treinos`, `alimentacao`, `kanban`) é uma fatia vertical
independente: schema Zod, repository Drizzle e server actions próprios. Nenhum
módulo importa o repository de outro — se o Dashboard precisa de dados de vários
módulos, ele importa a função pública de cada um (`getTodayCards()`,
`getTodayWorkout()`, etc.), nunca a tabela crua de outro módulo.

## Ambientes

| Ambiente | Onde | Banco |
|---|---|---|
| Local | máquina do Vinnicius, `next dev` | Projeto Supabase de desenvolvimento (gratuito) |
| Produção | EC2, container Docker | Projeto Supabase de produção |

Sem ambiente de "staging" dedicado na v1 — app de usuário único, o risco de pular
staging é aceitável e documentado como trade-off consciente.
