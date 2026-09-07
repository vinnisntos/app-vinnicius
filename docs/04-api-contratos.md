# API e Contratos por Módulo

Não há uma API REST pública versionada — os "contratos" abaixo são as funções que
cada módulo expõe (repository para leitura, server actions para escrita). Nomes
aqui são o contrato que a implementação deve seguir; assinaturas exatas de
TypeScript serão fixadas junto do schema Zod de cada módulo no início da
implementação.

Toda server action:
1. Recebe `FormData` ou objeto tipado.
2. Valida com o schema Zod do módulo — falha de validação nunca chega ao banco.
3. Chama o repository (Drizzle), que já filtra implicitamente por `user_id`
   (sessão do usuário autenticado, obtida via `@supabase/ssr` no server).
4. Revalida o path afetado (`revalidatePath`) para o Server Component atualizar.

---

## Alimentação

**Leitura**
- `getNutritionProfile()` — configurações + peso mais recente.
- `getTodayMeals(date)` — 4-5 slots do dia com status de conclusão.
- `getTodayWater(date)` — total ingerido vs. meta.
- `getWeightHistory(range)` — para gráfico de tendência.

**Escrita**
- `updateNutritionProfile(input)` — atualiza sexo/altura/atividade/meta calórica/meta de água.
- `logWeight({ date, weightKg })`.
- `toggleMeal({ date, mealSlot, isCompleted, description?, calories? })`.
- `logWater({ date, amountMl })`.

**Cálculo de TDEE** (Mifflin-St Jeor, executado no server a partir do peso mais
recente + `nutrition_profile`, nunca armazenado):

```
BMR (homem)  = 10 * peso_kg + 6.25 * altura_cm - 5 * idade + 5
BMR (mulher) = 10 * peso_kg + 6.25 * altura_cm - 5 * idade - 161

TDEE = BMR * fator_atividade
  sedentario   -> 1.2
  leve         -> 1.375
  moderado     -> 1.55
  ativo        -> 1.725
  muito_ativo  -> 1.9

deficit_do_dia = TDEE - calorias_consumidas_hoje
```

`calorias_consumidas_hoje` soma `meal_logs.calories` do dia (quando informado). A
meta fixa de 2500 kcal é o `calorie_goal` do usuário, exibida lado a lado com o
TDEE calculado — o app mostra as duas métricas e o déficit/superávit resultante,
sem forçar uma sobre a outra.

---

## Treinos

**Leitura**
- `getActivePlan()` — plano + exercícios agrupados por `day_label`.
- `getNextWorkoutDay()` — deriva A ou B por alternância a partir da última
  `workout_sessions.day_label` (regra pura, sem tabela de "próximo dia").
- `getWorkoutHistory(range)` — sessões + volume total por sessão (séries × reps).

**Escrita**
- `createWorkoutPlan(input)` / `upsertExercise(input)` — edição do plano (baixa
  frequência de uso, tela de configuração separada do fluxo diário).
- `startSession({ dayLabel, performedAt })`.
- `logSet({ sessionId, exerciseId, setNumber, repsDone, weightKg? })`.
- `finishSession({ sessionId, notes? })`.

---

## Financeiro

**Leitura**
- `getMonthSummary(yearMonth)` — total receita fixa, variável, despesas, saldo.
- `getTransactions({ yearMonth, categoryId?, type? })` — listagem filtrável.
- `getCategories()`.

**Escrita**
- `createTransaction(input)` / `updateTransaction(id, input)` / `deleteTransaction(id)`.
- `createCategory(input)`.

Regra de negócio única e explícita (evita ambiguidade de sinal): `amount` é
sempre positivo no banco; o repository decide soma ou subtração no agregado do
mês com base em `type` (`receita_*` soma, `despesa` subtrai).

---

## Estudos e Trabalhos (Kanban)

**Leitura**
- `getBoard()` — colunas com cartões ordenados.
- `getOverdueAndTodayCards()` — usado pelo Dashboard.

**Escrita**
- `createCard(input)` / `updateCard(id, input)` / `deleteCard(id)`.
- `moveCard({ cardId, toColumnId, toIndex })` — drag-and-drop; reordena
  `order_index` dos cartões afetados em uma transação.
- `createColumn(input)` / `renameColumn(id, name)` / `reorderColumns(input)`.

---

## Dashboard

Somente leitura, agregando os módulos acima — sem escrita própria:

- `getDailyOverview(date)` retorna:
  ```ts
  {
    pendingCards: KanbanCard[]       // getOverdueAndTodayCards()
    workout: { dayLabel, done: boolean }
    meals: { slot, isCompleted }[]
    water: { totalMl, goalMl }
    monthBalancePreview: number      // saldo parcial do mês corrente
  }
  ```

Cada campo é resolvido chamando a função pública do módulo dono do dado — o
Dashboard nunca faz `select` direto em tabela de outro módulo.

---

## Autenticação (não é um "módulo" de domínio, é transversal)

- `signIn({ email, password })` — Server Action, delega ao Supabase Auth via
  `@supabase/ssr`; erro genérico ("credenciais inválidas") independente da causa
  real, para não vazar se o e-mail existe.
- `signOut()`.
- Não existe `signUp` exposto na UI (cadastro é feito manualmente uma vez, via
  Supabase Studio ou seed — ver [`06-seguranca.md`](06-seguranca.md)).
- `middleware.ts` intercepta toda rota fora de `(auth)` e redireciona para
  `/login` se não houver sessão válida.
