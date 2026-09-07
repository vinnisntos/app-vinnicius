# ADR-0005: Build sempre fora da EC2 (GitHub Actions + GHCR)

## Status
Aceito — 2026-09-07

## Contexto
Até este ponto, o deploy (documentado na v1/v2 de
[`07-infraestrutura-deploy.md`](../07-infraestrutura-deploy.md)) rodava
`docker compose build` diretamente na instância EC2 compartilhada. Ao
implantar o módulo Alimentação, uma mudança na imagem base do Dockerfile
(`node:20-alpine` → `node:24-alpine`, para acompanhar a correção de um
conflito de peer dependency) forçou um build sem cache. A instância — que
tem apenas ~900 MB de RAM, compartilhados com outros projetos hospedados
nela (`marcai-app`, `governanca_ti`, apps .NET) — ficou completamente
não-responsiva por mais de 30 minutos: nginx parou de responder, o agente
SSM perdeu conexão, e **todos os sites da máquina caíram**, não só o Life
OS. A recuperação só veio depois de um `aws ec2 reboot-instances`
autorizado explicitamente pelo usuário.

## Decisão
`npm ci` e `next build` nunca mais rodam na EC2. Um workflow do GitHub
Actions (`.github/workflows/build-and-push.yml`) builda a imagem Docker a
cada push em `main`, usando o runner do GitHub (memória e CPU dedicadas,
sem contenção com outros serviços), e publica em
`ghcr.io/vinnisntos/app-vinnicius`. O deploy na EC2 passa a ser só
`docker compose pull && docker compose up -d` — nenhum desses comandos
builda nada, o consumo de memória é o mínimo necessário para baixar e
trocar a imagem.

## Consequências
- **Positivo:** a EC2 compartilhada nunca mais fica sob pressão de memória
  por causa do Life OS — protege também os outros projetos hospedados nela,
  que não têm nada a ver com este app mas sofreram o mesmo incidente.
- **Positivo:** builds ficam mais rápidos (cache de camadas do GitHub
  Actions) e não competem por recursos com o tráfego real do site durante o
  deploy.
- **Negativo:** o deploy completo agora depende de dois passos em lugares
  diferentes (CI publica a imagem; alguém aciona o pull na EC2 depois) — o
  próximo passo natural (disparar o pull automaticamente via SSM a partir do
  próprio workflow) ainda não está implementado, documentado como pendência
  em `07-infraestrutura-deploy.md`.
- Reforça a lição geral do [ADR-0004](0004-nginx-compartilhado-em-vez-de-caddy.md):
  esta instância não é dedicada ao Life OS — qualquer decisão de
  infraestrutura precisa considerar o impacto nos outros projetos que
  dividem a mesma máquina.
