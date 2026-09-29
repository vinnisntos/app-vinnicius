import type { LucideIcon } from "lucide-react";
import {
  Apple,
  BellRing,
  CircleHelp,
  Dumbbell,
  LayoutDashboard,
  ShieldCheck,
  SquareKanban,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Só aparece para role master (painel admin + módulos pessoais legados). */
  masterOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/alimentacao", label: "Alimentação", icon: Apple },
  { href: "/treinos", label: "Treinos", icon: Dumbbell },
  { href: "/lembretes", label: "Lembretes", icon: BellRing },
  { href: "/comunidade", label: "Comunidade", icon: Users },
  { href: "/faq", label: "Ajuda", icon: CircleHelp },
  { href: "/admin", label: "Admin", icon: ShieldCheck, masterOnly: true },
  { href: "/financeiro", label: "Financeiro", icon: Wallet, masterOnly: true },
  { href: "/estudos-trabalhos", label: "Estudos e Trabalhos", icon: SquareKanban, masterOnly: true },
];
