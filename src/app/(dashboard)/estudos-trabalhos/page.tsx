import type { Metadata } from "next";
import { SquareKanban } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Estudos e Trabalhos" };

export default function EstudosTrabalhosPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tighter">
        Estudos e Trabalhos
      </h1>
      <ModulePlaceholder
        icon={SquareKanban}
        title="Em construção"
        description="Kanban de provas, trabalhos, estágio e projetos pessoais chega em uma próxima fase da implementação."
      />
    </div>
  );
}
