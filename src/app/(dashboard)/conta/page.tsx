import type { Metadata } from "next";
import { AccountSettings } from "@/components/conta/account-settings";

export const metadata: Metadata = { title: "Minha conta" };

export default function ContaPage() {
  return <AccountSettings />;
}
