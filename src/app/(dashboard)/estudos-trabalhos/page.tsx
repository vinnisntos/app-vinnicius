import type { Metadata } from "next";
import { requireUserId } from "@/lib/auth/session";
import { getTodayIsoDate } from "@/lib/date";
import { getBoard } from "@/lib/modules/estudos-trabalhos/repository";
import { KanbanBoard } from "@/components/estudos-trabalhos/kanban-board";

export const metadata: Metadata = { title: "Estudos e Trabalhos" };

export default async function EstudosTrabalhosPage() {
  const userId = await requireUserId();
  const todayIso = getTodayIsoDate();
  const columns = await getBoard(userId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tighter">
        Estudos e Trabalhos
      </h1>
      <KanbanBoard initialColumns={columns} todayIso={todayIso} />
    </div>
  );
}
