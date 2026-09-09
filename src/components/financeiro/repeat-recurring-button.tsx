"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { repeatRecurringTransactions } from "@/lib/modules/financeiro/actions";

function formatMonthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 15));
  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function RepeatRecurringButton({
  count,
  previousYearMonth,
}: {
  count: number;
  previousYearMonth: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  function handleClick() {
    setError(undefined);
    startTransition(async () => {
      const result = await repeatRecurringTransactions();
      if (result.error) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  if (done) return null;

  return (
    <Card className="border-brand-500/20 bg-brand-600/5">
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-600/10 text-brand-400">
              <RotateCcw className="size-4" aria-hidden />
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhuma transação este mês. Repetir as{" "}
              <span className="font-semibold text-foreground">{count}</span>{" "}
              recorrentes de {formatMonthLabel(previousYearMonth)}?
            </p>
          </div>
          <Button type="button" size="sm" disabled={isPending} onClick={handleClick}>
            {isPending ? "Repetindo…" : "Repetir recorrentes"}
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
