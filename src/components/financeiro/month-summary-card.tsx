import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MonthBalance } from "@/lib/modules/financeiro/calculations";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}

export function MonthSummaryCard({ balance }: { balance: MonthBalance }) {
  const isPositive = balance.balance >= 0;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Balanço do mês</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatBlock
            label="Receita fixa"
            value={formatBRL(balance.totalFixedIncome)}
          />
          <StatBlock
            label="Receita variável"
            value={formatBRL(balance.totalVariableIncome)}
          />
          <StatBlock label="Despesas" value={formatBRL(balance.totalExpenses)} />
        </div>

        <p
          className={cn(
            "font-mono text-2xl font-semibold",
            isPositive ? "text-success-500" : "text-red-400",
          )}
        >
          {formatBRL(balance.balance)}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            saldo do mês
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
