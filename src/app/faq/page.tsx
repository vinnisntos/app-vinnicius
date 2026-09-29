import type { Metadata } from "next";
import { FaqBrowser } from "@/components/faq/faq-browser";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ajuda" };

export default async function FaqPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <FaqBrowser backHref={user ? "/" : "/login"} />;
}
