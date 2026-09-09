import Link from "next/link";
import { SquareKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { isOverdue } from "@/lib/modules/estudos-trabalhos/calculations";
import type { BoardCard } from "@/lib/modules/estudos-trabalhos/repository";

const MAX_VISIBLE_CARDS = 3;

export function KanbanSummaryCard({
  pendingCards,
  todayIso,
}: {
  pendingCards: BoardCard[];
  todayIso: string;
}) {
  const visibleCards = pendingCards.slice(0, MAX_VISIBLE_CARDS);
  const remainingCount = pendingCards.length - visibleCards.length;

  return (
    <Link href="/estudos-trabalhos">
      <Card className="h-full transition-colors duration-150 hover:ring-brand-500/30">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-400">
            <SquareKanban className="size-4" aria-hidden />
          </div>
          <p className="text-sm font-semibold">Estudos e Trabalhos</p>
        </CardHeader>
        <CardContent>
          {pendingCards.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma pendência hoje.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {visibleCards.map((card) => (
                <li key={card.id} className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      isOverdue(card.dueDate, card.completedAt, todayIso)
                        ? "border-danger-500/30 text-red-400"
                        : "border-brand-500/30 text-brand-400"
                    }
                  >
                    {isOverdue(card.dueDate, card.completedAt, todayIso)
                      ? "Atrasado"
                      : "Hoje"}
                  </Badge>
                  <p className="truncate text-sm">{card.title}</p>
                </li>
              ))}
              {remainingCount > 0 ? (
                <p className="text-xs text-muted-foreground">
                  +{remainingCount} pendência(s)
                </p>
              ) : null}
            </ul>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
