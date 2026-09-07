import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}

export function CalorieSummaryCard({
  tdee,
  calorieGoal,
  caloriesConsumedToday,
  deficit,
}: {
  tdee: number;
  calorieGoal: number;
  caloriesConsumedToday: number;
  deficit: number;
}) {
  const progressPct = Math.min(
    100,
    Math.round((caloriesConsumedToday / calorieGoal) * 100),
  );
  const isOverGoal = caloriesConsumedToday > calorieGoal;
  const isDeficit = deficit >= 0;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Balanço calórico de hoje</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <StatBlock label="TDEE calculado" value={`${Math.round(tdee)} kcal`} />
          <StatBlock label="Meta" value={`${Math.round(calorieGoal)} kcal`} />
          <StatBlock
            label="Consumidas hoje"
            value={`${Math.round(caloriesConsumedToday)} kcal`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-200",
                isOverGoal ? "bg-danger-500" : "bg-brand-500",
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {progressPct}% da meta calórica de hoje
          </p>
        </div>

        <p
          className={cn(
            "text-sm font-medium",
            isDeficit ? "text-success-500" : "text-red-400",
          )}
        >
          {isDeficit
            ? `Déficit de ${Math.round(deficit)} kcal em relação ao TDEE`
            : `Superávit de ${Math.round(Math.abs(deficit))} kcal em relação ao TDEE`}
        </p>
      </CardContent>
    </Card>
  );
}
