# Escopo do produto — fonte de verdade

Definido pelo dono do produto em 2026-09-29. Toda fase, spec de handoff e
revisão (Claude e Codex) se mede contra este documento.

## Visão

Hub de **autoajuda comunitária** para emagrecimento e uso de
**peptídeos / medicamentos hormonais** (ex.: GLP-1), com dicas, mentoria,
agenda e **documentação da progressão pessoal** de cada usuário.
Não vendemos planilha: vendemos **impulso coletivo** e comunidade ampla, por
um preço baixo. O app precisa **induzir uso diário constante** e o usuário
precisa **entender o que está fazendo** em cada tela.

Restrição de negócio: **custo de infraestrutura zero** (free tiers e APIs
gratuitas). Stack mantida (Next.js 16 + Supabase + Drizzle); a lógica nova
complementa o MVP existente.

## Requisitos

| # | Requisito | Situação (2026-09-29) |
|---|---|---|
| 1 | Tenant simples por usuário; papéis `master` e `user` | ✅ |
| 2 | Painel do administrador (herdeiro do Financeiro): ver/gerir assinaturas, liberar/remover | ✅ `/admin` |
| 3 | Mobile first, PWA com atalho na tela inicial | ✅ PWA · 🔄 UX Fase 7 |
| 4 | UI/UX fluida, limpa, no padrão de mercado; responsiva e agradável | 🔄 Fase 7 |
| 5 | Alimentação: dados consistentes, métricas inteligentes, kcal/macros recomendados, persistência local (offline), baixo atrito | ✅ métricas · ⚠️ entrada ainda digitada → catálogo de alimentos |
| 6 | Água por dia, como hoje | ✅ |
| 7 | Ícone `?` em TODAS as partes explicando o uso correto | ✅ onde existe tela · verificar módulos novos |
| 8 | Hub comunitário (rede social), postar a refeição ao marcá-la | ✅ |
| 9 | Notificações para quando o usuário está fora do app | ✅ Google Agenda · proposta: Web Push gratuito |
| 10 | FAQ do básico ao complexo, sem suporte humano; fallback WhatsApp do dono | ✅ estrutura · ❌ conteúdo |
| 11 | Google Agenda para lembrar treinos, sem custo | ✅ (falta configurar credenciais) |
| 12 | E-mail precisa de `@`; celular só catálogo | ✅ |
| 13 | 3 dias grátis; pode assinar antes; "poluição visual" até assinar | ✅ |
| 14 | **Peptídeos/medicamentos hormonais**: registro de doses, agenda de aplicação, rodízio de local, efeitos colaterais | ❌ |
| 15 | **Documentação da progressão**: peso, medidas corporais, linha do tempo | ⚠️ só peso |
| 16 | **Treinos prontos**: academia, corrida, ganho de massa, perda de peso, casa | ❌ |
| 17 | **Mentoria/dicas**: conteúdo curado pelo master | ❌ |

## Regras de segurança do domínio (não negociáveis)

- O app **registra** o que o usuário e seu médico definiram; **nunca
  sugere, calcula ou recomenda dose** de medicamento/peptídeo. Nenhuma tela
  pode induzir aumento de dose.
- Aviso fixo nos módulos de medicação: "Este app não substitui
  acompanhamento médico. Siga a prescrição do seu médico."
- Efeitos colaterais graves listados no registro exibem orientação para
  procurar atendimento médico — o app não faz triagem.
- Dados de saúde são sensíveis (LGPD): nada de medicação aparece na
  comunidade a menos que o próprio usuário publique.
- Pisos calóricos seguros já existem (1200 kcal F / 1500 kcal M).

## Papéis

- **Claude** — arquitetura, banco, RLS, regras de negócio, APIs, contratos
  de tipo, conteúdo semente (FAQ, treinos, alimentos), revisão e aceite.
- **Codex** — UI/UX mobile-first sobre os contratos prontos, seguindo as
  regras R1–R5 da Fase 7 (`docs/ux-audit-phase7.md`).
- Aceite de UI é medido (Chrome headless 390×844), não declarado.
