import type { Metadata } from "next";
import { requireUserId } from "@/lib/auth/session";
import { getTodayIsoDate } from "@/lib/date";
import {
  computeMonthBalance,
  getPreviousYearMonth,
  getYearMonth,
} from "@/lib/modules/financeiro/calculations";
import {
  getCategories,
  getTransactionsForMonth,
} from "@/lib/modules/financeiro/repository";
import { MonthSummaryCard } from "@/components/financeiro/month-summary-card";
import { RepeatRecurringButton } from "@/components/financeiro/repeat-recurring-button";
import { TransactionFormDialog } from "@/components/financeiro/transaction-form-dialog";
import { TransactionsList } from "@/components/financeiro/transactions-list";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage() {
  const userId = await requireUserId();
  const todayIso = getTodayIsoDate();
  const yearMonth = getYearMonth(todayIso);
  const previousYearMonth = getPreviousYearMonth(yearMonth);

  const [categories, transactions, previousMonthTransactions] = await Promise.all([
    getCategories(userId),
    getTransactionsForMonth(userId, yearMonth),
    getTransactionsForMonth(userId, previousYearMonth),
  ]);

  const balance = computeMonthBalance(transactions);
  const recurringCount =
    transactions.length === 0
      ? previousMonthTransactions.filter((t) => t.isRecurring).length
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tighter">Financeiro</h1>
        <TransactionFormDialog categories={categories} todayIso={todayIso} />
      </div>

      <MonthSummaryCard balance={balance} />

      {recurringCount > 0 ? (
        <RepeatRecurringButton count={recurringCount} previousYearMonth={previousYearMonth} />
      ) : null}

      <TransactionsList transactions={transactions} />
    </div>
  );
}
