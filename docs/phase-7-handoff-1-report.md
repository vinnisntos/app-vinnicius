# Fase 7 — Handoff 1: Dashboard, Alimentação e Água

Data: 2026-09-29  
Branch de trabalho: `feat/saas-foundation`

## Entregas

### Componentes base

- `src/components/ui/stepper.tsx`: stepper acessível com alvos de 48 px, `role="spinbutton"`, limites/valor ARIA, edição manual ao tocar no valor e repetição acelerada no toque longo.
- `src/components/ui/quick-chips.tsx`: chips reutilizáveis com alvo mínimo de 44 px e rolagem horizontal.
- `src/components/ui/bottom-action-bar.tsx`: barra fixa acima da bottom nav no mobile, sticky no desktop e spacer exportado por constante/hook.
- `src/components/alimentacao/calorie-remaining-card.tsx`: card compartilhado de calorias e macros restantes, com faixas success/warning/danger.
- `src/components/alimentacao/meal-editor.tsx`: editor compartilhado em bottom sheet, sem teclado no caminho feliz.
- `src/components/alimentacao/weight-sheet.tsx`: registro de peso por Stepper, iniciado pelo último valor disponível.

### Dashboard `/`

- `src/app/(dashboard)/page.tsx` preserva o card de treino e restringe Kanban/Financeiro a master.
- `src/components/dashboard/dashboard-experience.tsx` consome `GET /api/dashboard/summary`, apresenta saudação compacta, “Restam”, “Agora” e próximo lembrete.
- `data-above-fold="kcal"` e `data-above-fold="next-action"` estão presentes.
- A BottomActionBar executa todos os tipos de `NextAction`: configuração, refeição no slot sugerido, água otimista com “Desfazer”, peso e água rápida no estado `all_done`; o summary é recarregado após writes.
- Foi omitido o emoji de `all_done` para manter consistência com a linguagem visual existente.

### Alimentação `/alimentacao`

- `src/components/alimentacao/nutrition-dashboard.tsx` ganhou topo compacto, seletor de data sob demanda, card compartilhado de calorias/macros, linhas de refeição inteiras tocáveis e barra inferior de ações.
- O slot sugerido usa `getNextAction`/`MEAL_WINDOWS`; o editor oferece chips de slot, Stepper e incrementos de calorias, macros e descrição recolhidos e conclusão automática ao salvar.
- Peso usa o último registro (fallback 70 kg). Onboarding usa Stepper para altura/peso, selects dia/mês/ano e cards grandes para atividade e objetivo.
- A fila offline continua isolada por `userId`; respostas 4xx continuam descartadas e falhas de rede permanecem na fila.

### Água e navegação

- `src/components/alimentacao/water-tracker.tsx` usa progresso teal→emerald, estado explícito de meta batida, chips +150/+200/+300/+750, Stepper de quantidade personalizada e “Desfazer último”.
- +250/+500 estão na BottomActionBar da página de Alimentação.
- `water_logs.amount_ml` continua ligado ao HelpHint.
- `src/components/layout/mobile-bottom-nav.tsx` mantém o filtro por papel e passa a usar rótulos de 12 px com contraste `zinc-300`.
- `src/app/globals.css` expõe tokens Tailwind v4 para success, warning e danger; brand permanece reservado à identidade/navegação.

## Atendimento às regras R1–R5

| Regra | Dashboard | Alimentação | Água |
|---|---|---|---|
| R1 — Zona do polegar | Próxima ação e +250 ml ficam na BottomActionBar. Em 390×844, uma barra de 64 px com bottom de 84 px começa em ~696 px (82% da altura). | Registrar refeição e +250/+500 ficam na mesma posição; salvar refeição, peso e onboarding ficam no rodapé dos sheets/barra. | Atalhos mais usados ficam na barra inferior; controles menos frequentes permanecem no card. |
| R2 — Sem digitação | Água e peso usam Stepper/atalhos; refeição abre o editor compartilhado. | Calorias/macros, peso, altura e peso inicial usam Stepper; nascimento usa selects e texto opcional fica recolhido. | Quantidades comuns usam chips e valor personalizado usa Stepper. |
| R3 — Cor semântica | Estado no plano/CTA saudável usa success, 85–100% warning e excesso danger. | Conclusão/CTAs saudáveis usam success; card de energia usa as três faixas. | Progresso teal→emerald e meta cumprida em success. |
| R4 — Contraste | Metadados têm no mínimo 12 px e `zinc-300`. | Textos secundários tocados têm no mínimo 12 px e `zinc-300`. | Rótulos/estado/ações secundárias seguem o mesmo piso; bottom nav usa 12 px. |
| R5 — Carga cognitiva | Saudação + “Restam” + “Agora” aparecem antes dos cards legados e cabem no primeiro viewport planejado. | O topo mostra somente título/data; energia, refeições e ação primária têm hierarquia direta. | Total, meta, progresso e estado cumprido aparecem juntos. |

## Atributos de aceite

- Dashboard: `next-action`, `water-quick`, `save-meal`, `save-weight`.
- Alimentação: `add-meal`, `water-quick`, `save-meal`, `save-weight`, `onboarding-submit`.
- Água: `water-custom`; os atalhos principais +250/+500 usam `water-quick` na barra da página.
- Above-fold: `kcal` e `next-action`.

## Verificação

Executado após a implementação:

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | OK |
| `npx eslint src` | OK, sem warnings |
| `npm test -- --run` | OK — 10 arquivos, 86 testes |
| `npx next build` | OK — Next.js 16.3.4, 46 páginas geradas |
| grep `text-[10px]`, `text-[11px]`, `opacity-70` nos arquivos tocados | zero ocorrências |

O build foi executado sem iniciar ou interromper o servidor do usuário na porta 3000.

## Pendências para o coordenador

- `DashboardSummary` não expõe `latest_weight`; por isso o sheet de peso aberto a partir do Dashboard usa o fallback conservador de 70 kg. Em `/alimentacao`, onde `NutritionDay.latest_weight` existe, o último peso é usado corretamente. Incluir o peso no contrato exigiria mudança em `src/types/**`/backend, explicitamente fora deste handoff.
- Permaneceram intocados os arquivos já modificados/não rastreados que estavam no worktree e são alheios a este handoff: `docs/ux-audit-phase7.md`, `docs/escopo-produto.md` e `supabase/migrations/0005_health_hub.sql`.
