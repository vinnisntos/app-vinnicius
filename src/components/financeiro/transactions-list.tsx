import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TransactionWithCategory } from "@/lib/modules/financeiro/repository";
import { DeleteTransactionButton } from "./delete-transaction-button";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function TransactionsList({
  transactions,
}: {
  transactions: TransactionWithCategory[];
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Transações do mês</h2>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma transação registrada este mês.
          </p>
        ) : (
          <ul className="flex flex-col">
            {transactions.map((t) => {
              const isExpense = t.type === "despesa";
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 border-b border-white/5 py-3 last:border-0"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {t.description}
                      </p>
                      {t.categoryName ? (
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: `${t.categoryColor}4d`,
                            color: t.categoryColor ?? undefined,
                          }}
                        >
                          {t.categoryName}
                        </Badge>
                      ) : null}
                      {t.isRecurring ? (
                        <Badge variant="secondary">Recorrente</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(t.occurredOn)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        "font-mono text-sm font-semibold",
                        isExpense ? "text-red-400" : "text-success-500",
                      )}
                    >
                      {isExpense ? "−" : "+"}
                      {formatBRL(t.amount)}
                    </span>
                    <DeleteTransactionButton id={t.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
