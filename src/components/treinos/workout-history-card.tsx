import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { SessionHistoryEntry } from "@/lib/modules/treinos/repository";

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function WorkoutHistoryCard({
  history,
}: {
  history: SessionHistoryEntry[];
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Histórico</h2>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum treino registrado ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="flex justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0"
              >
                <span>
                  {formatDate(entry.performedAt)} — Treino {entry.dayLabel}
                </span>
                <span className="font-mono text-muted-foreground">
                  {entry.volume} reps
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
