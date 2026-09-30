import { computeMonthBalance, getYearMonth } from "@/lib/modules/financeiro/calculations";
import { getTransactionsForMonth } from "@/lib/modules/financeiro/repository";
import { getOverdueAndTodayCards, type BoardCard } from "@/lib/modules/estudos-trabalhos/repository";

export type DailyOverview = { pendingCards: BoardCard[]; monthBalancePreview: number };

/** Resumo legado restrito aos dois cards administrativos do master. */
export async function getDailyOverview(userId: string, todayIso: string): Promise<DailyOverview> {
  const [pendingCards, transactions] = await Promise.all([
    getOverdueAndTodayCards(userId, todayIso),
    getTransactionsForMonth(userId, getYearMonth(todayIso)),
  ]);
  return { pendingCards, monthBalancePreview: computeMonthBalance(transactions).balance };
}
