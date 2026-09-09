import type { Metadata } from "next";
import { requireUserId } from "@/lib/auth/session";
import { getTodayIsoDate } from "@/lib/date";
import { computeMonthBalance, getYearMonth } from "@/lib/modules/financeiro/calculations";
import {
  getCategories,
  getTransactionsForMonth,
} from "@/lib/modules/financeiro/repository";
import { MonthSummaryCard } from "@/components/financeiro/month-summary-card";
import { TransactionFormDialog } from "@/components/financeiro/transaction-form-dialog";
import { TransactionsList } from "@/components/financeiro/transactions-list";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage() {
  const userId = await requireUserId();
  const todayIso = getTodayIsoDate();
  const yearMonth = getYearMonth(todayIso);

  const [categories, transactions] = await Promise.all([
    getCategories(userId),
    getTransactionsForMonth(userId, yearMonth),
  ]);

  const balance = computeMonthBalance(transactions);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tighter">Financeiro</h1>
        <TransactionFormDialog categories={categories} todayIso={todayIso} />
      </div>

      <MonthSummaryCard balance={balance} />

      <TransactionsList transactions={transactions} />
    </div>
  );
}
