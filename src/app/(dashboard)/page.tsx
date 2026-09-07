import type { Metadata } from "next";
import Link from "next/link";
import { Apple, Dumbbell, SquareKanban, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

const SUMMARY_CARDS = [
  { href: "/financeiro", label: "Financeiro", icon: Wallet, hint: "Saldo do mês" },
  { href: "/treinos", label: "Treinos", icon: Dumbbell, hint: "Treino de hoje" },
  { href: "/alimentacao", label: "Alimentação", icon: Apple, hint: "Calorias e água" },
  {
    href: "/estudos-trabalhos",
    label: "Estudos e Trabalhos",
    icon: SquareKanban,
    hint: "Pendências de hoje",
  },
] as const;

function getGreeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "";

  const now = new Date();
  const hour = Number(
    now.toLocaleString("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }),
  );
  const today = now.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 px-6 py-10 md:px-10 md:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[size:40px_40px] opacity-[0.08] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)]"
        />
        <div className="relative">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
            {today}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tighter md:text-5xl">
            {getGreeting(hour)}
            {displayName ? `, ${displayName}` : ""}.
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            O checklist diário consolidado (treino, refeições, água e
            pendências) aparece aqui assim que os módulos abaixo forem
            implementados.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUMMARY_CARDS.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="transition-colors duration-150 hover:ring-brand-500/30">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <div className="flex size-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-400">
                  <item.icon className="size-4" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-2 w-full rounded-full bg-white/5">
                  <div className="h-2 w-0 rounded-full bg-brand-500" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
