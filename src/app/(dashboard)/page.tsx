import type { Metadata } from "next";
import { DashboardExperience } from "@/components/dashboard/dashboard-experience";
import { KanbanSummaryCard } from "@/components/dashboard/kanban-summary-card";
import { getAccessStatus } from "@/lib/access/status";
import { requireUserId } from "@/lib/auth/session";
import { getTodayIsoDate } from "@/lib/date";
import { getDailyOverview } from "@/lib/modules/dashboard/repository";
export const metadata: Metadata = { title: "Dashboard" };
export default async function DashboardPage() {
  const userId = await requireUserId();
  const todayIso = getTodayIsoDate();
  const access = await getAccessStatus(userId);
  const isMaster = access.access_state === "master";
  const overview = isMaster ? await getDailyOverview(userId, todayIso) : null;
  return <DashboardExperience userId={userId} masterCards={overview ? <KanbanSummaryCard pendingCards={overview.pendingCards} todayIso={todayIso} /> : null} />;
}
