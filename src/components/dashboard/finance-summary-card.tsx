import Link from "next/link";
import { Wallet } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FinanceSummaryCard({ balance }: { balance: number }) {
  const isPositive = balance >= 0;

  return (
    <Link href="/financeiro">
      <Card className="h-full transition-colors duration-150 hover:ring-brand-500/30">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-400">
            <Wallet className="size-4" aria-hidden />
          </div>
          <p className="text-sm font-semibold">Financeiro</p>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "font-mono text-2xl font-semibold",
              isPositive ? "text-success-500" : "text-red-400",
            )}
          >
            {formatBRL(balance)}
          </p>
          <p className="text-xs text-muted-foreground">saldo do mês</p>
        </CardContent>
      </Card>
    </Link>
  );
}
