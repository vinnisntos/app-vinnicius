import type { Metadata } from "next";
import { DashboardExperience } from "@/components/dashboard/dashboard-experience";
import { FinanceSummaryCard } from "@/components/dashboard/finance-summary-card";
import { KanbanSummaryCard } from "@/components/dashboard/kanban-summary-card";
import { getAccessStatus } from "@/lib/access/status";
import { requireUserId } from "@/lib/auth/session";
import { getTodayIsoDate } from "@/lib/date";
import { getDailyOverview } from "@/lib/modules/dashboard/repository";
import { getCategories } from "@/lib/modules/financeiro/repository";
export const metadata: Metadata = { title: "Dashboard" };
export default async function DashboardPage() {
  const userId = await requireUserId();
  const todayIso = getTodayIsoDate();
  const access = await getAccessStatus(userId);
  const isMaster = access.access_state === "master";
  const [overview, categories] = isMaster ? await Promise.all([getDailyOverview(userId, todayIso), getCategories(userId)]) : [null, null];
  return <DashboardExperience userId={userId} masterCards={overview && categories ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><KanbanSummaryCard pendingCards={overview.pendingCards} todayIso={todayIso} /><FinanceSummaryCard balance={overview.monthBalancePreview} categories={categories} todayIso={todayIso} /></div> : null} />;
}
