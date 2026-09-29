import type { Metadata } from "next";
import { RemindersDashboard } from "@/components/reminders/reminders-dashboard";

export const metadata: Metadata = { title: "Lembretes" };

export default async function RemindersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <RemindersDashboard googleResult={typeof params.google === "string" ? params.google : undefined} googleReason={typeof params.motivo === "string" ? params.motivo : undefined} />;
}
