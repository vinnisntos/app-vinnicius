import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TransactionFormDialog } from "@/components/financeiro/transaction-form-dialog";
import type { FinanceCategory } from "@/lib/db/schema";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FinanceSummaryCard({
  balance,
  categories,
  todayIso,
}: {
  balance: number;
  categories: FinanceCategory[];
  todayIso: string;
}) {
  const isPositive = balance >= 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <Link
          href="/financeiro"
          className="flex items-center gap-3 hover:text-brand-400"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-400">
            <Wallet className="size-4" aria-hidden />
          </div>
          <p className="text-sm font-semibold">Financeiro</p>
        </Link>
        <TransactionFormDialog
          categories={categories}
          todayIso={todayIso}
          trigger={
            <Button type="button" variant="ghost" size="icon" aria-label="Nova transação">
              <Plus className="size-4" />
            </Button>
          }
        />
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
  );
}
