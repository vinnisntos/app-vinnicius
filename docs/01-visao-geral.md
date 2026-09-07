# Visão Geral

## Problema

Vinnicius acompanha, hoje, a própria rotina (faculdade, estágio, treino, alimentação
e finanças) em ferramentas soltas — ou de cabeça. Nada conversa entre si, então não
existe uma visão única do dia nem histórico confiável de treino, alimentação ou caixa.

## Objetivo

Um "Life OS" pessoal, de único usuário, que:

- **Consolida o dia** em um dashboard único (o que estudar, o que o estágio cobra,
  se o treino do dia foi feito, se a meta calórica/água foi batida).
- **Registra histórico** de treino, peso, refeições, água e transações financeiras
  o suficiente para enxergar tendência (semana/mês), não só o instante presente.
- **É privado** — login obrigatório, dados sensíveis (finanças, saúde) nunca públicos.
- **Parece "seu"** — herda a identidade visual de vinnisantos.com.br, não parece um
  SaaS genérico.

## Não-objetivos (fora de escopo v1)

- Multiusuário/colaboração (arquitetura já isola por `user_id`, mas não há convite,
  papéis ou compartilhamento na v1).
- App mobile nativo (o frontend web é responsivo; PWA instalável é um "nice to have"
  futuro, não requisito de v1).
- Integrações externas (importação bancária via Open Finance, sincronização com
  wearables, etc.) — entrada é manual na v1.
- Gamificação, notificações push, relatórios em PDF.

## Persona

Único usuário: Vinnicius — desenvolvedor full stack, cursando faculdade, estagiando,
treinando calistenia, também motorista de aplicativo como renda extra. Acessa de
desktop (foco/planejamento) e mobile (registro rápido: bateu água, terminou o treino).

## Módulos e histórias de usuário centrais

### Dashboard
- Como usuário, ao abrir o app eu vejo, para **hoje**: cards do Kanban com prazo
  hoje/atrasados, status do treino do dia (A ou B), progresso de água/refeições, e
  um atalho para lançar uma transação financeira.

### Financeiro
- Registro rápido de receita fixa (estágio), receita variável (corridas) e despesas,
  categorizadas, com visão de saldo do mês e comparação com meses anteriores.

### Treinos (calistenia, divisão AB)
- Plano fixo com treino A e treino B, exercícios com séries/reps alvo. Ao treinar,
  o usuário registra séries/reps/carga feitas; histórico permite ver progressão.

### Alimentação
- Calculadora de TDEE (Mifflin-St Jeor) a partir de peso/altura/idade/sexo/atividade;
  meta calórica fixa de 2500 kcal com cálculo de déficit/superávit do dia. Checklist
  de refeições (café, almoço, lanche, jantar) e log de água com meta diária.

### Estudos e Trabalhos
- Kanban simples (colunas configuráveis, ex.: A Fazer / Fazendo / Feito) com cartões
  categorizados em Faculdade, Estágio ou Projeto Pessoal, com prazo opcional.

## Critérios de sucesso da v1

- Vinnicius consegue, em menos de 1 minuto pela manhã, saber o que fazer no dia.
- Todo lançamento (treino, refeição, água, transação, cartão) leva menos de
  3 toques/cliques.
- Login privado funcionando em `agenda.vinnisantos.com.br` com HTTPS.
- Nenhum dado sensível acessível sem autenticação (validado por RLS + testes manuais).
