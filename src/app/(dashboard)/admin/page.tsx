import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/admin-panel";
import { requireMasterPage } from "@/lib/access/status";
import { requireUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin" };
export default async function AdminPage() {
  const userId = await requireUserId();
  await requireMasterPage(userId);
  return <AdminPanel />;
}
