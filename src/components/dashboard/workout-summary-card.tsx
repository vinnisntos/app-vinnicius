import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { DayLabel } from "@/lib/modules/treinos/calculations";

export function WorkoutSummaryCard({
  hasPlan,
  dayLabel,
  done,
}: {
  hasPlan: boolean;
  dayLabel: DayLabel;
  done: boolean;
}) {
  return (
    <Link href="/treinos">
      <Card className="h-full transition-colors duration-150 hover:ring-brand-500/30">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-400">
            <Dumbbell className="size-4" aria-hidden />
          </div>
          <p className="text-sm font-semibold">Treinos</p>
        </CardHeader>
        <CardContent>
          {hasPlan ? (
            <div className="flex items-center gap-2">
              <p className="font-mono text-2xl font-semibold">Dia {dayLabel}</p>
              <Badge
                variant="outline"
                className={
                  done
                    ? "border-success-500/30 text-success-500"
                    : "border-white/10 text-muted-foreground"
                }
              >
                {done ? "Treinado" : "Pendente"}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Crie seu plano de treino
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
