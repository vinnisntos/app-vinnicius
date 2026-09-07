import type { Metadata } from "next";
import { Apple } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Alimentação" };

export default function AlimentacaoPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tighter">Alimentação</h1>
      <ModulePlaceholder
        icon={Apple}
        title="Em construção"
        description="Calculadora de TDEE, checklist de refeições e água chegam na próxima fase da implementação — primeiro módulo de dados a ser construído."
      />
    </div>
  );
}
