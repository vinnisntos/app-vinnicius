import type { Metadata } from "next";
import { DashboardExperience } from "@/components/dashboard/dashboard-experience";
import { FinanceSummaryCard } from "@/components/dashboard/finance-summary-card";
import { KanbanSummaryCard } from "@/components/dashboard/kanban-summary-card";
import { WorkoutSummaryCard } from "@/components/dashboard/workout-summary-card";
import { getAccessStatus } from "@/lib/access/status";
import { requireUserId } from "@/lib/auth/session";
import { getTodayIsoDate } from "@/lib/date";
import { getDailyOverview } from "@/lib/modules/dashboard/repository";
import { getCategories } from "@/lib/modules/financeiro/repository";
export const metadata: Metadata = { title: "Dashboard" };
export default async function DashboardPage() {
  const userId = await requireUserId();
  const todayIso = getTodayIsoDate();
  const [overview, categories, access] = await Promise.all([getDailyOverview(userId, todayIso), getCategories(userId), getAccessStatus(userId)]);
  const isMaster = access.access_state === "master";
  return <DashboardExperience legacyCards={<div className="grid grid-cols-1 gap-4 md:grid-cols-2"><WorkoutSummaryCard hasPlan={overview.workout.hasPlan} dayLabel={overview.workout.dayLabel} done={overview.workout.done} />{isMaster ? <><KanbanSummaryCard pendingCards={overview.pendingCards} todayIso={todayIso} /><FinanceSummaryCard balance={overview.monthBalancePreview} categories={categories} todayIso={todayIso} /></> : null}</div>} />;
}
