import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Dumbbell,
  LayoutDashboard,
  SquareKanban,
  Wallet,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/treinos", label: "Treinos", icon: Dumbbell },
  { href: "/alimentacao", label: "Alimentação", icon: Apple },
  { href: "/estudos-trabalhos", label: "Estudos e Trabalhos", icon: SquareKanban },
];
