"use client";

import { useTransition } from "react";
import { Droplet } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logWater } from "@/lib/modules/alimentacao/actions";

const QUICK_AMOUNTS_ML = [200, 300, 500];

export function WaterTracker({
  totalMl,
  goalMl,
  logDate,
}: {
  totalMl: number;
  goalMl: number;
  logDate: string;
}) {
  const [isPending, startTransition] = useTransition();
  const progressPct = Math.min(100, Math.round((totalMl / goalMl) * 100));

  function addWater(amountMl: number) {
    startTransition(async () => {
      await logWater({ logDate, amountMl });
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <h2 className="text-lg font-semibold">Água</h2>
        <Droplet className="size-4 text-brand-400" aria-hidden />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="font-mono text-2xl font-semibold">
          {(totalMl / 1000).toFixed(2)} L{" "}
          <span className="text-sm font-normal text-muted-foreground">
            / {(goalMl / 1000).toFixed(1)} L
          </span>
        </p>

        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-2 rounded-full bg-brand-500 transition-all duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex gap-2">
          {QUICK_AMOUNTS_ML.map((amount) => (
            <Button
              key={amount}
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() => addWater(amount)}
            >
              +{amount} ml
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
