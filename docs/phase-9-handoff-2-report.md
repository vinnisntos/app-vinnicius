# Fase 9 — Handoff 2: Alimentação inteligente e Saúde

Data: 2026-09-29 · Branch: `feat/saas-foundation`

## Arquivos

- `src/components/alimentacao/calorie-remaining-card.tsx`, `meal-editor.tsx`, `nutrition-dashboard.tsx`, `water-tracker.tsx`
- `src/components/dashboard/dashboard-experience.tsx`
- `src/components/saude/health-dashboard.tsx`, `medication-form-sheet.tsx`, `medication-log-sheet.tsx`
- `src/app/(dashboard)/saude/page.tsx`
- `src/components/layout/nav-items.ts`, `mobile-bottom-nav.tsx`, `account-menu.tsx`, `app-shell.tsx`
- `src/components/ui/quick-chips.tsx`
- Este relatório.

Nenhum arquivo de backend, tipo, API, autenticação, Supabase, proxy, configuração, comunidade, assinatura ou treinos foi editado. Não houve dependência nova, migração, commit ou push. O servidor do usuário na porta 3000 não foi interrompido.

## Entrega 0 — correções do handoff 1

- Card calórico: o rótulo agora é “Calorias do dia”; “Restam” aparece só no valor.
- Editor: a etapa rápida tem apenas o rótulo do Stepper para calorias. O slot ativo é preenchido em success; os outros têm contorno neutro.
- Chips horizontais ocultam a barra de rolagem com `scrollbar-width: none` e `::-webkit-scrollbar`, preservando rolagem por toque.
- Água personalizada usa `data-secondary-action="water-custom"`.
- O sheet de peso do Dashboard parte de `summary.latest_weight_kg`, com fallback 70 kg.

## Entrega 1 — alimentos

- O editor compartilhado busca o catálogo com debounce de 250 ms, filtro de categoria em português e lista de recentes antes do catálogo quando a busca está vazia.
- A seleção abre porções com Stepper de 0,5 a 20, atalhos ½/1/1½/2, prévia de kcal e P/C/G escalada, HelpHint de porções e `data-primary-action="add-food"` no rodapé.
- O POST envia `MealItemAdd` com UUID do cliente. O editor mostra itens e total; remover usa DELETE. A linha da refeição resume os dois primeiros nomes e “+N”.
- “Não achei o alimento” abre a etapa rápida com Stepper e chips de kcal; ela envia `custom` via a mesma rota de itens. O estado do sheet é otimista e, se a gravação falhar, restaura os itens, mostra o erro e permanece aberto.
- A fila offline isolada por usuário permanece para o fluxo antigo de conclusão de refeição. Itens novos não entram nessa fila. O card calórico usa HelpHint `metric.macros`, obtido da rota de alimentos.

## Entrega 2 — Saúde

- Nova rota `/saude` com abas Medicação e Progresso. O texto exato de `MEDICATION_DISCLAIMER` aparece na aba e nos sheets de medicação.
- Medicação: estado vazio, cards com dose declarada como prescrita, status de hoje/próxima data, histórico com desfazer, contagem de efeitos, pausa/reativação e exclusão com confirmação de perda de histórico.
- Registro usa o componente compartilhado `MedicationLogSheet`: oito locais, sugestão apenas de rodízio de local, último local, efeitos de seleção múltipla e intensidade 0–3. O payload omite a dose para que a API use a prescrita. Severidade forte mostra o aviso `Efeitos fortes ou persistentes: procure seu médico.` após salvar; `severe_recently` mantém o banner na tela.
- Cadastro/edição oferece sugestões de nome, categoria, via, unidade, frequência, dias, início e prescritor opcional. A dose começa como “Não informada” e só é enviada quando o Stepper é usado. Alterar dose ou unidade na edição pede confirmação médica; nenhuma dose é sugerida ou calculada.
- Progresso: filtros 30/90/180 dias, SVG do peso com quatro marcas e pontos interativos, variações de peso/cintura, lista das últimas medidas e quatro indicadores de constância. O sheet de medidas usa Stepper e envia apenas campos tocados; o atalho de peso reutiliza `WeightSheet`.

## Entrega 3 — Dashboard

- `log_medication` mostra “Hoje é dia de {name}” e abre o mesmo sheet de aplicação de Saúde.
- Card “Treino de hoje” usa `today_workout` e aparece antes dos cards legados; quando não há treino, aponta para `/treinos`.
- Card “Dica do dia” usa `daily_tip` e aponta para `/dicas`.

## Entrega 4 — navegação

- Bottom nav mobile: Início, Alimentação, Treinos, Saúde e Comunidade, sem “Mais”.
- Header mobile: botão de conta abre sheet com Lembretes, Dicas, Ajuda, Admin, Financeiro, Estudos e Trabalhos e Sair. Itens master preservam `masterOnly`.
- `NAV_ITEMS.mobile` separa tab de menu. A sidebar desktop continua usando todos os itens autorizados.

## Regras R1–R5

| Tela | R1 — polegar | R2 — entrada | R3 — cor | R4 — contraste | R5 — carga |
|---|---|---|---|---|---|
| Dashboard | Próxima ação na BottomActionBar; sheet de aplicação pelo mesmo fluxo de Saúde. | Peso e porções por Stepper. | Success em ações e estado bom; warning para refeição atrasada. | Metadados ≥ 12 px, tons zinc-300/emerald-200. | “Agora”, energia, treino e dica em sequência curta antes dos legados. |
| Alimentação | Registrar refeição, água e adicionar alimento no rodapé. | Busca é a única digitação do fluxo principal; porções e kcal rápidas usam Stepper/chips. | Slot e adição em success; demais slots neutros. | Texto dos itens e da prévia ≥ 12 px; sem opacidade em texto. | Recentes, catálogo, porção e itens da refeição em etapas claras. |
| Medicação | Cadastro/aplicação na BottomActionBar e salvar no rodapé do sheet. | Chips, grade e Stepper; texto para nome e prescritor opcional. | Due em warning, aplicado em success, efeitos fortes em danger. | Avisos e detalhes em zinc-200/300 ou rose-200 sobre superfícies escuras. | Dose prescrita informativa, local/efeitos organizados e histórico separado. |
| Progresso | Registrar medidas e peso na BottomActionBar. | Medidas e peso por Stepper; apenas campos tocados são enviados. | Queda de peso/cintura em success; aumento neutro. | Eixos, medidas e rótulos com ao menos 12 px. | Dois blocos de evolução e um card de constância. |
| Navegação mobile | Abas recorrentes fixas embaixo; conta no header para destinos menos frequentes. | Sem digitação. | Brand identifica navegação ativa. | Rótulos de 12 px e zinc-300. | Cinco abas previsíveis e menu separado. |

## Aceite executado

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | OK |
| `npx eslint src` | OK, sem warnings |
| `npm test` | OK, 12 arquivos e 108 testes |
| `npx next build` | OK, Next.js 16.3.4; `/saude` gerada |

Auditoria estática dos arquivos tocados: nenhum `text-[10px]`, `text-[11px]` ou `opacity-70` em texto. Os sheets usam Stepper com `role="spinbutton"`; o caminho principal de alimento e o registro de aplicação não renderizam `input[type=number]`. `add-food`, `log-dose` e `log-measurements` ficam em rodapés de sheet ou BottomActionBar. Chrome headless autenticado a 390×844 (`UX_MODE=h2`): **19 ok · 0 falhas**. Imagens em `%TEMP%/ux-fase9-h2-final2`.

O script temporário de medição foi atualizado fora do git: o seletor legado `save-meal` foi substituído pela busca de alimentos no modo h2, porque o novo editor só exibe `add-food` após escolher um alimento; a expressão usada para selecionar o alimento tinha um escape inválido, e a seleção agora espera a resposta assíncrona do catálogo. Nenhuma regra de negócio da medição foi relaxada.

## Pendências para o coordenador

- A rota `/dicas` ainda pertence ao próximo handoff; o link solicitado já está no Dashboard e no menu de conta.
- Itens de refeição não têm fila offline nesta fase, conforme o escopo: em falha de rede o sheet fica aberto e oferece nova tentativa. A fila antiga permanece por usuário.
