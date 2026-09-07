import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Treinos" };

export default function TreinosPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tighter">Treinos</h1>
      <ModulePlaceholder
        icon={Dumbbell}
        title="Em construção"
        description="Tracker de calistenia (divisão AB) chega em uma próxima fase da implementação."
      />
    </div>
  );
}
