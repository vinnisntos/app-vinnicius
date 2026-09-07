import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Financeiro" };

export default function FinanceiroPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tighter">Financeiro</h1>
      <ModulePlaceholder
        icon={Wallet}
        title="Em construção"
        description="Fluxo de caixa (renda fixa do estágio, corridas de app e despesas mensais) chega na próxima fase da implementação."
      />
    </div>
  );
}
