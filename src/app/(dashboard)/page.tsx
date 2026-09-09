import type { Metadata } from "next";
import { requireUserId } from "@/lib/auth/session";
import { getTodayIsoDate } from "@/lib/date";
import { getDailyOverview } from "@/lib/modules/dashboard/repository";
import { getCategories } from "@/lib/modules/financeiro/repository";
import { createClient } from "@/lib/supabase/server";
import { FinanceSummaryCard } from "@/components/dashboard/finance-summary-card";
import { KanbanSummaryCard } from "@/components/dashboard/kanban-summary-card";
import { NutritionSummaryCard } from "@/components/dashboard/nutrition-summary-card";
import { WorkoutSummaryCard } from "@/components/dashboard/workout-summary-card";

export const metadata: Metadata = { title: "Dashboard" };

function getGreeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardPage() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "";

  const todayIso = getTodayIsoDate();
  const [overview, categories] = await Promise.all([
    getDailyOverview(userId, todayIso),
    getCategories(userId),
  ]);

  const now = new Date();
  const hour = Number(
    now.toLocaleString("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }),
  );
  const today = now.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 px-6 py-10 md:px-10 md:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[size:40px_40px] opacity-[0.08] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)]"
        />
        <div className="relative">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
            {today}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tighter md:text-5xl">
            {getGreeting(hour)}
            {displayName ? `, ${displayName}` : ""}.
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            Seu checklist diário: treino, refeições, água, pendências e o
            saldo do mês, tudo num só lugar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <WorkoutSummaryCard
          hasPlan={overview.workout.hasPlan}
          dayLabel={overview.workout.dayLabel}
          done={overview.workout.done}
        />
        <NutritionSummaryCard
          meals={overview.meals}
          water={overview.water}
          todayIso={todayIso}
        />
        <KanbanSummaryCard pendingCards={overview.pendingCards} todayIso={todayIso} />
        <FinanceSummaryCard
          balance={overview.monthBalancePreview}
          categories={categories}
          todayIso={todayIso}
        />
      </div>
    </div>
  );
}
