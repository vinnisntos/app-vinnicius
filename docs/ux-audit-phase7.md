# Auditoria heurística de UX — Fase 7

Data: 2026-09-29 · Base: branch `feat/saas-foundation` (commit `c92bc72`)
Método: inspeção do código das telas, simulando um celular de 360×740 px
(zona do polegar = terço inferior da tela; zona difícil = terço superior,
cantos superiores). Critérios: Lei de Fitts/zona do polegar, esforço de
entrada, hierarquia de cor/contraste e carga cognitiva.

Veredito: o glassmorphism está aplicado, mas **nenhuma tela foi desenhada
em torno da ação principal do usuário**. As ações que se repetem várias vezes
ao dia estão no meio ou no topo da rolagem, a entrada de números é por
digitação e tudo usa o mesmo roxo — sucesso, alerta e ação primária não se
distinguem.

---

## 1. Zona do polegar e posição das ações (Fitts)

| Tela | Problema | Evidência |
|---|---|---|
| `/comunidade` | A ação principal ("Criar publicação") fica no **canto superior direito**, a pior área de alcance com uma mão. | `community-feed.tsx:96` — botão dentro do `<header>` |
| `/comunidade` | Apagar/ocultar post são ícones no topo de cada card, ao lado do nome — ações destrutivas na área de leitura, sem menu. | `community-feed.tsx:114` |
| `/assinar` | O CTA "Assinar agora" vem **depois** de título, parágrafo e 3 benefícios; num 360×740 cai abaixo da dobra e não é fixo. A única ação fixa visível no topo é "Sair". | `assinar/page.tsx:40–50`, `checkout-button.tsx` |
| Nag (trial) | O banner de escassez é **fixo no topo** e o "Assinar" é um link de texto sublinhado — alvo pequeno na zona difícil. | `nag-controller.tsx` (banner `fixed top-0`) |
| `/alimentacao` | As ações frequentes (água, marcar refeição) ficam **no meio da rolagem**: primeiro header + seletor de data, depois o anel de 160 px, só então água e refeições. Não há ação fixa na parte de baixo. | `nutrition-dashboard.tsx:123–157` |
| `/alimentacao` | O seletor de data (ação secundária) ocupa o topo com 3 controles; a ação primária do dia não tem lugar fixo. | `nutrition-dashboard.tsx:125–131` |

**Regra para a refatoração:** toda tela com ação primária recorrente tem
uma barra de ação fixa ou um FAB acima da bottom nav
(`bottom: calc(nav + safe-area)`). O topo fica só para título,
voltar e filtros.

## 2. Esforço de entrada (digitação no celular)

| Tela | Problema | Evidência |
|---|---|---|
| Editor de refeição | **4 campos numéricos digitados** (kcal, proteína, carbo, gordura) + descrição livre. Nenhum atalho. É a interação mais frequente do app. | `nutrition-dashboard.tsx:186–207` |
| Peso do dia | Campo numérico digitado, vazio, sem partir do último peso. Uma pesagem varia ±0,1–1 kg: stepper a partir do último valor resolve em 1–3 toques. | `nutrition-dashboard.tsx:250–254` |
| Onboarding | Altura e peso digitados; nascimento em `input type=date` (no Android abre um calendário que começa no ano atual — 30+ anos de rolagem). | `nutrition-dashboard.tsx:213–248` |
| Água | ✅ Já usa chips (+200/+300/+500) — **não é problema de entrada**. Falta: quantidade personalizada por stepper e feedback de meta batida. | `water-tracker.tsx` |
| Comunidade | Post exige texto livre; não há sugestões rápidas ("Bati a meta de água 💧", "Treino feito") para quem só quer registrar a vitória. | `community-feed.tsx:126–131` |

**Regra:** número = stepper `[-] valor [+]` com passo do domínio e
toque longo acelerando, mais chips de valores comuns; texto só quando não
há alternativa.

## 3. Cor, contraste e carga cognitiva

| Tela | Problema | Evidência |
|---|---|---|
| Global | **Tudo é roxo (brand)**: CTA primário, aba ativa, meal completa em alguns lugares, bordas selecionadas. O usuário não distingue "ação" de "estado bom". | classes `brand-*` em todas as telas |
| `/alimentacao` | O anel calórico é roxo quando está no plano e vermelho quando estoura — sem faixa intermediária (chegando perto do limite). Saúde deveria ser emerald/teal, alerta amber e excesso rose. | `nutrition-dashboard.tsx:165–184` |
| Água | Gradiente `sky → brand`: a meta cumprida não tem cor de sucesso. | `water-tracker.tsx` |
| Paywall/nag | Urgência usa **red** (cor de erro) e o CTA de assinar é roxo genérico. Direção: amber (escassez no trial), rose (bloqueio). | `nag-controller.tsx`, `assinar/page.tsx` |
| Contraste | Texto `text-zinc-500` e `text-[10px]`/`text-[11px]` com `opacity-70` sobre `bg-white/10` + gradiente: **abaixo de 4,5:1** em texto pequeno (contadores de reação, macros no card de refeição, metadados). | `community-feed.tsx:118, 123`; `mobile-bottom-nav.tsx` (rótulos 10px) |
| Dashboard `/` | **Não responde às duas perguntas sem rolar.** O primeiro viewport é um bloco de saudação com padding de 40 px; calorias restantes estão num card legado mais abaixo, **macros não existem** e não há "próxima ação/lembrete". | `(dashboard)/page.tsx` (hero + cards legados) |
| `/alimentacao` | Mostra só kcal. **Macros restantes não existem** — nem no backend (`NutritionMetrics` sem metas de proteína/carbo/gordura). | `src/types/database.ts` `NutritionMetrics` |

**Regra de cor (tokens a criar):** `success` = emerald/teal (meta no
plano, meta batida, ação saudável como "beber água"); `warning` = amber
(perto do limite, trial terminando); `danger` = rose (excedeu, bloqueado);
`brand` roxo = só identidade e navegação ativa. Texto secundário mínimo
`zinc-300` e 12 px; nada abaixo de 4,5:1.

---

## Pré-requisitos de backend (Claude, antes dos handoffs)

1. `NutritionMetrics` com metas e consumo de macros (proteína por kg de
   peso conforme objetivo; gordura 25% da meta; carbo = restante).
2. `GET /api/dashboard/summary`: métricas do dia + **próxima ação**
   calculada no servidor (completar perfil → refeição da janela atual →
   água atrasada em relação ao ritmo do dia → próximo lembrete).

## Ordem dos handoffs para o Codex

1. **Dashboard `/` + Alimentação + Água** (dividem os mesmos dados e a
   mesma barra de ação fixa; também criam os tokens de cor e os componentes
   base `Stepper`/`QuickChips`/`BottomActionBar`).
2. **Paywall/nag + Comunidade** (reaproveita os componentes base do 1).
