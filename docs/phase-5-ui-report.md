# Fase 5 — Comunidade, FAQ e Lembretes (UI)

Data: 2026-09-29

## Evidências de aceite

- `npx.cmd tsc --noEmit`: concluído sem erros.
- `npx.cmd eslint src`: concluído sem erros ou avisos.
- `npm.cmd test`: 9 arquivos e 73 testes aprovados.
- `npx.cmd next build`: concluído com sucesso em Next.js 16.3.4; 45 páginas geradas, incluindo `/comunidade`, `/faq` e `/lembretes`.
- `git diff --check`: sem erros de whitespace; apenas avisos informativos de conversão LF/CRLF no Windows.

## Entregas e desvios

- 0a — A fila de refeições usa `lifeos.nutrition.mealQueue:${userId}`, com `userId` obtido na Server Component; o nag também foi isolado por usuário. Sem desvio.
- 0b — O flush descarta lotes que falham com 4xx e informa quantas alterações não puderam ser salvas, mantendo na fila somente rede/5xx. Sem desvio.
- 0c — Conta revogada recebe mensagem de suspensão e apenas o suporte WhatsApp; o `CheckoutButton` também reconhece 403 `forbidden`. Sem desvio.
- 0d — A quantidade de dias do teste vem de `getAppSettings().trialDays`, com fallback defensivo somente se a configuração estiver ausente. Sem desvio.
- 0e — O `AppShell` reserva a altura do banner, incluindo safe area no mobile, quando o nag está em modo soft. Sem desvio.
- 1 — `/comunidade` possui abas, feed infinito, compositor com refeição e visibilidade, reações otimistas, exclusão, moderação master, estados completos e deep link “Compartilhar” na alimentação. Sem desvio.
- 2 — `/faq` é pública, detecta o destino de retorno pela sessão, oferece busca local, agrupamento, acordeões acessíveis, estados completos e rodapé WhatsApp. Sem desvio.
- 3 — `/admin` ganhou gestão completa de FAQ com rascunhos, criação, edição, exclusão e publicação otimista. Sem desvio.
- 4 — `/lembretes` oferece os quatro tipos, configuração semanal, status de sincronização, conexão OAuth por link, desconexão, reconexão em 409 e recuperação do registro salvo em 502; a navegação ganhou “Lembretes”. Sem desvio.
- 5 — O checkout tenta sem CPF, solicita e mascara o CPF somente após 422 `fields.cpf`, reenvia o payload e explica que o dado não é armazenado pelo app. Sem desvio.

## Arquivos

### Criados

- `src/app/(dashboard)/comunidade/page.tsx`
- `src/app/(dashboard)/lembretes/page.tsx`
- `src/app/faq/page.tsx`
- `src/components/admin/faq-admin.tsx`
- `src/components/community/community-feed.tsx`
- `src/components/faq/faq-browser.tsx`
- `src/components/reminders/reminders-dashboard.tsx`
- `docs/phase-5-ui-report.md`

### Alterados

- `src/app/(billing)/assinar/page.tsx`
- `src/app/(dashboard)/alimentacao/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/components/access/nag-controller.tsx`
- `src/components/admin/admin-panel.tsx`
- `src/components/alimentacao/nutrition-dashboard.tsx`
- `src/components/billing/checkout-button.tsx`
- `src/components/layout/app-shell.tsx`
- `src/components/layout/nav-items.ts`

Nenhum arquivo foi removido e nenhum arquivo proibido foi alterado.
