# ADR-0001: Escolha de stack

## Status
Aceito — 2026-09-07. Parcialmente superseded por
[ADR-0004](0004-nginx-compartilhado-em-vez-de-caddy.md): a camada de proxy/TLS
citada abaixo (Caddy) não se aplica mais — a EC2 real já usa nginx
compartilhado com outros projetos. O restante desta decisão (Next.js,
Supabase, Drizzle) permanece válido.

## Contexto
Requisito explícito: Postgres via Supabase é obrigatório. Infraestrutura é AWS
EC2, servindo `agenda.vinnisantos.com.br`. O restante da stack foi deixado em
aberto ("livre, desde que segura"). O app é de uso pessoal (usuário único),
guarda dado sensível (saúde, finanças), e precisa ter UI/UX equivalente à de
vinnisantos.com.br.

## Decisão
Next.js 15 (App Router, TypeScript) como frontend **e** backend (server
actions/route handlers), Supabase Postgres + Auth, Drizzle ORM, Zod, Tailwind
CSS v4 + shadcn/ui, empacotado em Docker atrás de Caddy na EC2.

## Alternativas consideradas

- **Backend separado (C#/ASP.NET Core, Node/Express, etc.) + SPA:** rejeitado
  para a v1. Seria a escolha certa se este fosse um produto com equipe, múltiplos
  clientes (mobile nativo, integrações de terceiros) ou processamento pesado —
  nenhum desses é o caso aqui. Um segundo runtime dobra o que precisa ser
  operado, monitorado e mantido seguro por uma única pessoa, sem benefício
  concreto para os módulos descritos (CRUD + alguns cálculos simples). Ver
  também [ADR-0002](0002-nextjs-como-backend.md).
- **Firebase/outro BaaS no lugar de Supabase:** descartado — Postgres via
  Supabase é requisito explícito, não negociável.
- **ORM alternativo (Prisma):** Prisma é uma opção igualmente válida; Drizzle
  foi preferido por gerar SQL mais previsível/legível e migrations como SQL puro
  versionável, o que facilita auditoria manual de uma mudança de schema num
  app que guarda dado de saúde/financeiro.

## Consequências
- Um único deployable simplifica CI/CD e observabilidade (bom para operação
  solo), mas acopla frontend e "backend" no mesmo processo/runtime — aceitável
  dado o perfil de carga (um usuário).
- Se no futuro o app precisar de um cliente não-web (app mobile nativo, CLI),
  a camada de repository/server actions precisará ser exposta como API HTTP
  formal — reavaliar nesse momento, não antecipar agora.
