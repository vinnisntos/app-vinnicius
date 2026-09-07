# ADR-0004: nginx compartilhado no lugar de Caddy dedicado

## Status
Aceito — 2026-09-07

## Contexto
[`ADR-0001`](0001-escolha-de-stack.md) e a v1 de
[`07-infraestrutura-deploy.md`](../07-infraestrutura-deploy.md) assumiram uma
EC2 dedicada ao Life OS, com Caddy cuidando de TLS automático. Ao inspecionar
a instância real (`i-0ea037e8a9c00acdf`) via SSM antes do primeiro deploy,
descobri que ela já é compartilhada por vários outros projetos (containers
Docker, apps .NET, outro app Next.js) e já usa **nginx + Certbot** como
convenção de reverse proxy/TLS estabelecida — não Caddy, e não dedicada.

## Decisão
Abandonar a suposição de Caddy dedicado. O Life OS entra como mais um vhost
nginx (`/etc/nginx/sites-available/agenda-vinnisantos` + Certbot para o
certificado), seguindo exatamente o padrão já em uso por
`governanca.vinnisantos.com.br` (outro app Next.js na mesma instância):
container Docker publicado só em `127.0.0.1:<porta>`, nginx fazendo o proxy
público. Porta atribuída: `3002` (ver `07-infraestrutura-deploy.md` para a
lista de portas já ocupadas por outros projetos).

## Consequências
- **Positivo:** reaproveita infraestrutura e convenções já testadas e em
  produção nessa instância (certbot já configurado e renovando outros
  certificados, nginx já tunado) — menos coisa nova para dar errado.
- **Negativo:** o Life OS não controla sozinho o nginx da instância — qualquer
  mudança de configuração (novo header, rota, redirect) precisa ser feita com
  cuidado para não afetar os outros sites hospedados ali. Documentado
  explicitamente em "Acesso à instância" (`07-infraestrutura-deploy.md`) como
  lembrete permanente.
- Sem impacto no restante da arquitetura da aplicação (Next.js, Supabase,
  Drizzle) — a mudança é só na camada de infraestrutura de borda.
