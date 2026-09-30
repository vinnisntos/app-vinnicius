import type { Metadata } from "next";
import { TrainingDashboard } from "@/components/treinos/training-dashboard";
export const metadata: Metadata = { title: "Treinos prontos" };
export default function TreinosPage() { return <TrainingDashboard />; }
