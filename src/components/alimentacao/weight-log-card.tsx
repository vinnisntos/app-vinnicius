"use client";

import { useState, useTransition } from "react";
import { Scale } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logWeight } from "@/lib/modules/alimentacao/actions";

export type WeightHistoryEntry = { loggedAt: string; weightKg: number };

export function WeightLogCard({
  history,
  logDate,
}: {
  history: WeightHistoryEntry[];
  logDate: string;
}) {
  const [weight, setWeight] = useState("");
  const [isPending, startTransition] = useTransition();
  const latest = history[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const weightKg = Number(weight);
    if (!weightKg) return;
    startTransition(async () => {
      await logWeight({ loggedAt: logDate, weightKg });
      setWeight("");
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <h2 className="text-lg font-semibold">Peso</h2>
        <Scale className="size-4 text-brand-400" aria-hidden />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {latest ? (
          <p className="font-mono text-2xl font-semibold">
            {Number(latest.weightKg).toFixed(1)} kg
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              último registro: {formatDate(latest.loggedAt)}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum peso registrado ainda.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="number"
            step="0.1"
            min={0}
            placeholder="Peso de hoje (kg)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <Button type="submit" disabled={isPending} variant="secondary">
            Registrar
          </Button>
        </form>

        {history.length > 1 ? (
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {history.slice(1, 6).map((entry) => (
              <li key={entry.loggedAt} className="flex justify-between">
                <span>{formatDate(entry.loggedAt)}</span>
                <span className="font-mono">
                  {Number(entry.weightKg).toFixed(1)} kg
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}
