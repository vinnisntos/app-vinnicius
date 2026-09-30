import type { LucideIcon } from "lucide-react";
import {
  Apple,
  BellRing,
  CircleHelp,
  Dumbbell,
  HeartPulse,
  Lightbulb,
  LayoutDashboard,
  ShieldCheck,
  SquareKanban,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Só aparece para role master (painel admin + módulos pessoais legados). */
  masterOnly?: boolean;
  mobile: "tab" | "menu";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início", icon: LayoutDashboard, mobile: "tab" },
  { href: "/alimentacao", label: "Alimentação", icon: Apple, mobile: "tab" },
  { href: "/treinos", label: "Treinos", icon: Dumbbell, mobile: "tab" },
  { href: "/saude", label: "Saúde", icon: HeartPulse, mobile: "tab" },
  { href: "/comunidade", label: "Comunidade", icon: Users, mobile: "tab" },
  { href: "/lembretes", label: "Lembretes", icon: BellRing, mobile: "menu" },
  { href: "/dicas", label: "Dicas", icon: Lightbulb, mobile: "menu" },
  { href: "/faq", label: "Ajuda", icon: CircleHelp, mobile: "menu" },
  { href: "/admin", label: "Admin", icon: ShieldCheck, masterOnly: true, mobile: "menu" },
  { href: "/estudos-trabalhos", label: "Estudos e Trabalhos", icon: SquareKanban, masterOnly: true, mobile: "menu" },
];
