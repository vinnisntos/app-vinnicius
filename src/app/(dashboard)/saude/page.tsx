import type { Metadata } from "next";
import { HealthDashboard } from "@/components/saude/health-dashboard";
export const metadata: Metadata = { title: "Saúde" };
export default function HealthPage() { return <HealthDashboard />; }
