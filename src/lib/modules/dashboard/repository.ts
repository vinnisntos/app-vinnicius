import { getOverdueAndTodayCards, type BoardCard } from "@/lib/modules/estudos-trabalhos/repository";

export type DailyOverview = { pendingCards: BoardCard[] };

/** Resumo do Kanban disponível apenas para o master. */
export async function getDailyOverview(userId: string, todayIso: string): Promise<DailyOverview> {
  return { pendingCards: await getOverdueAndTodayCards(userId, todayIso) };
}
