# ADR-0006: Connection string do Supabase usa o pooler de transação, não o de sessão

## Status
Aceito — 2026-09-09

## Contexto
Desde a Fundação, `DATABASE_URL` apontava para o pooler do Supabase na
porta `5432` ("Session mode"): cada conexão aberta pelo `postgres-js`
ocupa um backend Postgres dedicado por toda a vida da conexão, e esse modo
tem um teto duro de **15 clientes simultâneos por projeto** — compartilhado
entre a aplicação, Supabase Studio, e qualquer outra ferramenta conectada.

Isso passou despercebido enquanto cada página só fazia 1-3 queries
sequenciais. Ao implementar o módulo Dashboard (`getDailyOverview()`,
que dispara 8 queries em paralelo via `Promise.all` compondo dado dos
outros 4 módulos), a aplicação em produção começou a falhar com:

```
[cause]: aE: (EMAXCONNSESSION) max clients reached in session mode -
max clients are limited to pool_size: 15
```

A causa raiz tinha duas camadas: (1) processos `next dev` locais desta
sessão de desenvolvimento não foram encerrados corretamente pelo
`pkill -f "next dev"` no ambiente Windows/Git Bash — `taskkill //F //IM
node.exe` foi o que efetivamente os matou, revelando 3 processos `node.exe`
ainda vivos mantendo conexões abertas contra o pooler; e (2), mesmo depois
de matá-los, o mesmo erro se repetiu (em outra query) só com o tráfego
normal da aplicação — confirmando que o modo sessão já estava
estruturalmente perto do limite, e o Dashboard (maior concorrência por
requisição) foi só o gatilho que expôs o problema.

Notavelmente, `src/lib/db/client.ts` já tinha `{ prepare: false }` na
conexão — a configuração exigida especificamente para o pooler de
**transação** (que não suporta prepared statements entre conexões
pooladas, já que uma transação pode cair em um backend físico diferente da
anterior). Ou seja, o código já estava pronto para o modo certo; só a
`DATABASE_URL` apontava para o modo errado.

## Decisão
`DATABASE_URL` passa a usar a porta `6543` (pooler de transação) em vez de
`5432` (pooler de sessão), no mesmo host
(`aws-0-us-east-1.pooler.supabase.com`). O modo transação multiplexa muitas
conexões de aplicação sobre poucas conexões físicas do Postgres,
devolvendo a conexão ao pool assim que cada transação termina — é o modo
recomendado pelo próprio Supabase para servidores de aplicação (Next.js
incluído) que fazem várias queries curtas e concorrentes por requisição,
exatamente o padrão que o Dashboard introduziu.

Nenhuma mudança de código foi necessária além da string de conexão — o
`prepare: false` já presente era, na prática, a metade da migração que já
tinha sido feita.

## Consequências
- **Positivo:** elimina o teto de 15 conexões simultâneas como fator
  limitante — o modo transação escala para muito mais concorrência por
  requisição sem esgotar o pool.
- **Positivo:** nenhuma mudança de schema, query ou código de aplicação;
  troca isolada em `.env.local`/`.env.production`.
- **Lição operacional:** em ambiente Windows/Git Bash, `pkill -f "next
  dev"` não mata de forma confiável o processo `node.exe` real por trás do
  `npm run dev` — usar `taskkill //F //IM node.exe` para garantir que
  servidores de desenvolvimento local não fiquem com conexões penduradas
  contra o Postgres depois de encerrada a sessão de trabalho.
- Reforça, num nível diferente, a mesma lição dos ADRs anteriores: recursos
  compartilhados com teto fixo (RAM da EC2 no ADR-0005, conexões do pooler
  aqui) só se revelam como gargalo quando a carga real os alcança — vale
  revisar limites de capacidade a cada módulo novo que aumenta concorrência
  ou volume, não só depois que algo quebra em produção.
