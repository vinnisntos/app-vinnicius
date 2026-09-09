# Design System

Tokens extraídos diretamente do bundle publicado de **vinnisantos.com.br**
(CSS compilado, Tailwind v4) para que `agenda.vinnisantos.com.br` seja lido como
o mesmo produto, não um app à parte. Fonte: `theme-color`/`color-scheme` do
`<head>` e variáveis `@theme` do CSS de produção do site.

## Personalidade

Dark-mode nativo (não é um "dark mode opcional" — é a única identidade), tom
técnico/dev-tool, tipografia grande e pesada nos títulos, superfícies "vidro"
sutis sobre fundo quase-preto, acento violeta como única cor de marca. Nada de
ilustração/foto — a UI é 100% tipografia + cor + espaço.

## Cor

| Token | Valor | Uso |
|---|---|---|
| `bg-base` | `#09090B` | fundo da página (único, sem variação por seção) |
| `fg-base` | `#FFFFFF` | texto primário |
| `surface` | `white / 5%` sobre `bg-base` | fundo de cards/painéis (`bg-white/5`) |
| `surface-border` | `white / 10%` | borda de cards (`border-white/10`); `white/5%` para divisores mais discretos |
| `accent-500` | `#A855F7` | cor de marca — links, ícones ativos, foco |
| `accent-600` | `#9333EA` | botão primário (fundo) |
| `accent-400` | `#C084FC` | hover/estado claro do acento, texto de destaque sobre fundo escuro |
| `accent-900` | violeta bem escuro (`oklch(38.1% .176 304.987)`) | fim de gradientes decorativos |
| `success-500` | verde (`oklch(72.3% .219 149.579)`) | estados positivos (meta batida, saldo positivo) |
| `danger-500` | vermelho (`oklch(63.7% .237 25.331)`) | erros de formulário, saldo negativo, atraso |
| `neutral-400/500/600/700` | cinza-azulado (`oklch`, escala "gray" do Tailwind) | texto secundário, placeholders, ícones inativos |

Regra de uso: cor sólida (`accent-600`/`success-500`/`danger-500`) só em
elementos de ação ou status pontual (botão, badge, ícone). Fundos de área nunca
usam cor sólida — usam a mesma cor em opacidade baixa (5–10%) sobre `bg-base`,
como o site faz (`bg-purple-600/10`, `bg-green-500/5`, `bg-red-500/5`). Isso é o
que dá o efeito "vidro" sem recorrer a blur pesado em todo elemento.

## Tipografia

- **Fonte de UI:** stack de sistema (`ui-sans-serif, system-ui, -apple-system,
  "Segoe UI", Roboto, sans-serif`) — sem Google Fonts, sem custo de carregamento,
  igual ao site.
- **Fonte mono:** `"JetBrains Mono", "Fira Code", "Cascadia Code", monospace` —
  reservada para dado numérico denso e "técnico": valores monetários em tabelas,
  séries/reps/carga no tracker de treino, contagem regressiva/timestamps. Não usar
  em corpo de texto normal.
- **Escala:** `text-sm` (0.875rem) corpo/rótulos, `text-base` texto padrão,
  `text-2xl`–`text-4xl` títulos de seção/card, `text-5xl`+ reservado para o
  cabeçalho do Dashboard (saudação do dia) — não usar tamanhos grandes em telas
  de módulo, são para o "hero" do dashboard.
- **Peso:** `font-semibold`/`font-bold` em títulos, `font-black` só em números
  de destaque (ex. saldo do mês, kcal restantes). Corpo sempre `font-normal`.
  Rótulos pequenos em maiúsculas usam `tracking-widest` (ex. "TREINO DE HOJE").
- **Tracking:** títulos grandes usam `tracking-tighter` (aperta o letreiro,
  efeito "display" do site); texto normal não tem tracking customizado.

## Espaço, raio, sombra

- **Raio:** `rounded-lg` (8px) para cards/inputs/botões; `rounded-sm` (4px) para
  badges/tags pequenas; `rounded-full` para avatares e pills de status.
- **Borda:** 1px, sempre em opacidade baixa de branco ou da cor semântica
  (`border-white/10` neutro, `border-purple-500/30` em foco/seleção,
  `border-green-500/30`/`border-red-500/30` em banners de status).
- **Sombra "glow":** halo suave na cor de acento atrás de elementos primários
  (botão primário, card em destaque), `box-shadow` colorido e desfocado
  (`0 0 24px rgb(139 92 246 / 0.3)` como referência) — usar com moderação, 1-2
  elementos por tela, nunca em todos os cards.
- **Grade de fundo:** o Dashboard pode reaproveisar o padrão sutil de grade
  pontilhada (`background-size: 40px 40px`) atrás do cabeçalho, como textura de
  fundo — decorativo, nunca atrás de texto de leitura longa.
- **Foco acessível:** todo elemento interativo tem `ring` visível em
  `accent-500` a 20% de opacidade no `:focus-visible` — nunca remover outline
  sem substituir.

## Componentes base (shadcn/ui, tema aplicado)

Usar shadcn/ui como base (Radix por baixo — acessibilidade de teclado/ARIA já
resolvida) e re-temear via tokens acima, não recriar componentes do zero:

- **Button:** `primary` (fundo `accent-600`, glow sutil, texto branco),
  `secondary` (`surface` + `surface-border`, sem glow), `ghost` (transparente,
  hover `bg-white/5`), `destructive` (`danger-500`, só para exclusão).
- **Card:** `bg-white/5`, `border border-white/10`, `rounded-lg`, `p-4`/`p-6`.
  É a unidade visual repetida em todos os módulos (um card de refeição, um
  card de cartão do Kanban, um card de resumo financeiro).
- **Input/Select/Checkbox:** fundo `bg-white/5`, borda `border-white/10`,
  foco muda borda para `accent-500/50` + ring. Erro de validação muda borda
  para `danger-500/50` e mostra mensagem em `text-red-400 text-sm` abaixo.
- **Badge:** `rounded-sm`, cor semântica em opacidade baixa de fundo + texto
  sólido da mesma cor (ex. categoria "Faculdade" vs. "Estágio" vs. "Projeto
  Pessoal" no Kanban usam 3 cores neutras/acento distintas, não semânticas).
- **Progress (água, calorias, meta do mês):** barra fina, trilho `bg-white/5`,
  preenchimento `accent-500`; quando a meta é "não ultrapassar" (ex. calorias),
  preenchimento vira `danger-500` ao passar de 100%.

## Marca

`src/components/layout/logo.tsx` — marca própria do app (`LogoMark` +
`Logo`): quadrado `brand-600` com um pulso de ECG em branco, mesma peça
reaproveitada como favicon (`src/app/icon.svg`). Só forma geométrica e cor
sólida, sem ilustração — a mesma regra da seção Personalidade.

## Layout

- Container principal `max-w-7xl` (80rem) centralizado, como o site.
- Sidebar de navegação fixa em desktop (ícone + label dos 5 módulos + logout),
  colapsa para bottom-tab-bar ou drawer em mobile (`md:` como breakpoint de
  corte, igual ao site: `md:flex`/`md:hidden`).
- Todo módulo segue o mesmo esqueleto de página: cabeçalho (`h1` + ação
  primária à direita) → grid de cards de resumo → conteúdo detalhado
  (tabela/lista/board) abaixo. Consistência de esqueleto > liberdade por
  módulo — usuário não deve reaprender a UI a cada seção.

## Responsividade e states

- Mobile-first; breakpoints do Tailwind padrão (`sm` 40rem, `md` 48rem, `lg`
  64rem), coerente com o que o site já usa.
- Todo card com dado assíncrono tem 3 estados desenhados: carregando
  (skeleton `bg-white/5 animate-pulse`), vazio (mensagem + call-to-action,
  nunca uma tabela em branco), erro (banner `bg-red-500/5 border-red-500/30`
  com ação de retry).
- Transições `duration-150`/`duration-200` (o site usa 150-300ms) em hover/foco;
  nada de animação decorativa que atrase a leitura de dado.
