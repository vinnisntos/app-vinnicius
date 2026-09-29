import type { Metadata } from "next";
import { CommunityFeed } from "@/components/community/community-feed";
import { requireUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Comunidade" };

export default async function CommunityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const userId = await requireUserId();
  const params = await searchParams;
  const mealId = typeof params.meal === "string" ? params.meal : undefined;
  const initialDate = typeof params.date === "string" ? params.date : undefined;
  return <CommunityFeed userId={userId} initialMealId={mealId} initialDate={initialDate} />;
}
