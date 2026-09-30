# Fase 9 — Handoff 3: aceite de UX

Data: 2026-09-29 · Branch: `feat/saas-foundation`

## Arquivos

- Treinos: `src/app/(dashboard)/treinos/page.tsx`, `src/app/(dashboard)/treinos/meu-plano/page.tsx`, `src/components/treinos/training-dashboard.tsx`.
- Dicas: `src/app/(dashboard)/dicas/page.tsx`, `src/components/tips/tips-browser.tsx`, `src/components/admin/tips-admin.tsx`, `src/components/admin/admin-panel.tsx`, `src/components/dashboard/dashboard-experience.tsx`.
- Comunidade: `src/components/community/community-feed.tsx`.
- Assinatura: `src/app/(billing)/assinar/page.tsx`, `src/components/billing/checkout-button.tsx`, `src/components/access/nag-controller.tsx`.
- Lembretes: `src/components/reminders/reminders-dashboard.tsx`.
- Este relatório. O medidor `.tmp-thumbzone.mjs` foi ampliado fora do git.

Nenhum arquivo de API, biblioteca, tipos, autenticação, Supabase, proxy, configuração ou service worker foi alterado. Não houve dependências ou migrations.

## Entregas

1. **Treinos prontos.** `/treinos` abre catálogo filtrável por objetivo, local e nível, cards com duração e frequência e detalhes com exercícios, descanso, intensidade e notas. A matrícula usa `POST /api/training/enrollment`. Com programa ativo há próximo treino, progresso de rotina ou linear, selo do dia, histórico e execução com marcação de séries, cronômetro e descanso regressivo. A conclusão usa Stepper de duração, esforço 1–5 com HelpHint, notas opcionais e `POST /api/training/logs`; a resposta atualiza o próximo treino. Programa concluído oferece escolha de outro; troca exige confirmação. O plano AB anterior está em `/treinos/meu-plano` por link secundário.
2. **Dicas.** `/dicas` filtra categorias e abre leitura em 16 px, largura limitada e quebras de linha preservadas. `?tip=<id>` abre a dica do Dashboard. No painel master, a seção “Dicas / mentoria” cria, edita, despublica e exclui dicas, com confirmação para excluir.
3. **Comunidade.** “Criar publicação” virou FAB acima da navegação. O compositor tem quatro sugestões manuais, sem publicar dados de medicação automaticamente. Apagar, ocultar e reexibir passaram para o menu “⋯” com sheet de confirmação. Contadores e metadados passaram a ao menos 12 px e `zinc-300`.
4. **Assinatura e avisos.** “Assinar agora” usa BottomActionBar fixa e success. Benefícios descrevem alimentação, medicação, treinos, comunidade e lembretes. Trial usa warning; bloqueio ou revogação usa danger. O banner permanece no topo com botão de 44 px porque colocá-lo acima da bottom nav cobriria a barra de ação em telas pequenas. O CTA do modal está no rodapé e usa success.
5. **Lembretes.** O tipo `medicacao` tem card “Aplicação da medicação”. Horários comuns são chips, o ajuste usa Stepper de 15 min, dias usam chips e o CTA fica na BottomActionBar. A remoção e a desconexão do Google usam confirmação em sheet.

## Regras R1–R5 por tela

| Tela | R1 — polegar | R2 — entrada | R3 — cor | R4 — contraste | R5 — carga |
|---|---|---|---|---|---|
| Treinos | `enroll` e `finish-workout` na BottomActionBar; conclusão no rodapé do sheet. | Filtros e séries por toque; duração por Stepper; notas opcionais. | Success em começar/concluir, danger em sair do programa. | Metadados ≥12 px e `zinc-300`. | Catálogo, detalhe, execução e conclusão em etapas. |
| Dicas | Cards inteiros tocáveis; leitura abre em sheet. | Categoria em chips; texto só no admin. | Success na publicação. | Leitura em 16 px e linha limitada. | Lista curta por categoria e conteúdo isolado. |
| Comunidade | FAB `new-post` acima da nav; Publicar no rodapé. | Chips preenchem o texto; escrita livre opcional. | Success na publicação, danger na exclusão. | Contadores e metadados ≥12 px, `zinc-300`. | Ações destrutivas dentro do menu e confirmação. |
| Assinatura | `subscribe` fixo em 703 px no viewport 390×844. | Só CPF quando o checkout pedir. | Trial amber, bloqueio rose, CTA emerald. | Texto secundário `zinc-300`; botão de 48 px. | Cinco benefícios diretos e CTA persistente. |
| Lembretes | Salvar na BottomActionBar. | Horários em chips e Stepper de 15 min; dias em chips. | Success em salvar, danger em remover. | Rótulos e status com ao menos 12 px. | Escolha do tipo antes da edição. |

## Aceite

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | OK |
| `npx eslint src` | OK, sem warnings |
| `npm test` | OK, 12 arquivos e 108 testes |
| `npx next build` | OK, Next.js 16.3.4; `/dicas` e `/treinos/meu-plano` geradas |
| Chrome headless 390×844, `UX_MODE=h3` | **19 ok · 0 falhas**; imagens em `%TEMP%/ux-fase9-h3-final` |
| Regressão `UX_MODE=h2` | **19 ok · 0 falhas**; imagens em `%TEMP%/ux-fase9-h2-regressao` |
| Busca estática nos arquivos tocados | Nenhum `window.confirm`, `window.prompt`, `text-[10px]`, `text-[11px]` ou `opacity-70` |

O medidor h3 autenticou um usuário temporário, verificou os CTAs do catálogo e programa ativo, abriu “Concluir treino” e confirmou ausência de `input[type=number]` visível, além de medir Comunidade e Assinatura. A correção final do posicionamento de Assinatura moveu o componente de checkout para fora de um card com `backdrop-blur`, que alterava o referencial do posicionamento fixo. Após essa mudança, TypeScript e ESLint passaram novamente e o Chrome mediu o CTA em 703 px. O build foi executado uma vez nesta etapa, antes dessa mudança de posição.

## Desvios e pendências para o coordenador

- O backend disponível expõe `GET /api/tips` apenas para dicas publicadas. A seção master permite despublicar, mas uma dica despublicada deixa de aparecer na lista após recarregar; recuperar ou editar conteúdo despublicado exigiria uma rota master de listagem, fora do escopo autorizado para UI.
- A API de checkout recusa acesso revogado (403). Para esse estado, a tela mantém contato com suporte em vez de oferecer um checkout que falharia.
- Validar o conteúdo editorial das dicas e a operação real do checkout/Google Agenda em ambiente de produção; as medições usaram conta temporária e não iniciaram pagamento nem sincronização externa.
