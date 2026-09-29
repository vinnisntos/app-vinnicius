import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mealLogs, postReactions, posts } from "@/lib/db/schema";
import type {
  FeedPost,
  MealSlot,
  PostVisibility,
  ReactionKind,
} from "@/types/database";
import type { CreatePostInput } from "./schema";

/**
 * Via Drizzle a RLS de posts NÃO se aplica — a regra de visibilidade que a
 * policy `community_or_owner_select` garante no PostgREST é reescrita aqui,
 * explicitamente, em `visibleTo()`. Qualquer query nova de posts de
 * terceiros precisa passar por ela.
 */
const visibleTo = (viewerId: string, isMaster: boolean) =>
  isMaster
    ? sql`true`
    : sql`((p.visibility = 'public' and not p.is_hidden) or p.user_id = ${viewerId})`;

type FeedRow = {
  id: string;
  user_id: string;
  meal_log_id: string | null;
  body: string | null;
  visibility: PostVisibility;
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: Date;
  updated_at: Date;
  author_name: string | null;
  author_avatar: string | null;
  meal_slot: MealSlot | null;
  meal_log_date: string | null;
  meal_description: string | null;
  meal_calories: string | null;
  meal_protein: string | null;
  meal_carbs: string | null;
  meal_fat: string | null;
  reaction_counts: Partial<Record<ReactionKind, number>> | null;
  my_reaction: ReactionKind | null;
};

const numOrNull = (v: string | null) => (v == null ? null : Number(v));

function toFeedPost(r: FeedRow, viewerId: string, viewerIsMaster: boolean): FeedPost {
  return {
    post: {
      id: r.id,
      user_id: r.user_id,
      meal_log_id: r.meal_log_id,
      body: r.body,
      visibility: r.visibility,
      is_hidden: r.is_hidden,
      // Motivo de moderação: só o master e o próprio autor veem.
      hidden_reason: viewerIsMaster || r.user_id === viewerId ? r.hidden_reason : null,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    },
    author: { id: r.user_id, full_name: r.author_name, avatar_url: r.author_avatar },
    meal: r.meal_slot
      ? {
          meal_slot: r.meal_slot,
          log_date: r.meal_log_date!,
          description: r.meal_description,
          calories: numOrNull(r.meal_calories),
          protein_g: numOrNull(r.meal_protein),
          carbs_g: numOrNull(r.meal_carbs),
          fat_g: numOrNull(r.meal_fat),
        }
      : null,
    reaction_counts: r.reaction_counts ?? {},
    my_reaction: r.my_reaction,
  };
}

export async function getFeed(input: {
  viewerId: string;
  isMaster: boolean;
  scope: "community" | "mine";
  cursor: { createdAt: string; id: string } | null;
  limit: number;
  postId?: string;
}): Promise<FeedPost[]> {
  const scopeFilter =
    input.scope === "mine"
      ? sql`p.user_id = ${input.viewerId}`
      : input.isMaster
        ? sql`p.visibility = 'public'`
        : sql`p.visibility = 'public' and not p.is_hidden`;

  const rows = await db.execute<FeedRow>(sql`
    select p.id, p.user_id, p.meal_log_id, p.body, p.visibility, p.is_hidden, p.hidden_reason,
           p.created_at, p.updated_at,
           pr.full_name as author_name, pr.avatar_url as author_avatar,
           m.meal_slot, m.log_date::text as meal_log_date, m.description as meal_description,
           m.calories as meal_calories, m.protein_g as meal_protein, m.carbs_g as meal_carbs, m.fat_g as meal_fat,
           (select jsonb_object_agg(t.kind, t.n)
              from (select r.kind, count(*)::int as n from public.post_reactions r
                    where r.post_id = p.id group by r.kind) t) as reaction_counts,
           (select r.kind from public.post_reactions r
             where r.post_id = p.id and r.user_id = ${input.viewerId}) as my_reaction
    from public.posts p
    join public.profiles pr on pr.id = p.user_id
    left join public.meal_logs m on m.id = p.meal_log_id
    where ${scopeFilter}
      and ${visibleTo(input.viewerId, input.isMaster)}
      and (${input.postId ?? null}::uuid is null or p.id = ${input.postId ?? null}::uuid)
      and (${input.cursor?.createdAt ?? null}::timestamptz is null
           or (p.created_at, p.id) < (${input.cursor?.createdAt ?? null}::timestamptz, ${input.cursor?.id ?? null}::uuid))
    order by p.created_at desc, p.id desc
    limit ${input.limit}
  `);

  return rows.map((r) => toFeedPost(r, input.viewerId, input.isMaster));
}

export async function countRecentPosts(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(posts)
    .where(and(eq(posts.userId, userId), gte(posts.createdAt, sql`now() - interval '24 hours'`)));
  return row?.n ?? 0;
}

export async function ownsMealLog(userId: string, mealLogId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: mealLogs.id })
    .from(mealLogs)
    .where(and(eq(mealLogs.id, mealLogId), eq(mealLogs.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function insertPost(userId: string, input: CreatePostInput) {
  const [row] = await db
    .insert(posts)
    .values({
      ...(input.id && { id: input.id }),
      userId,
      body: input.body,
      mealLogId: input.meal_log_id,
      visibility: input.visibility,
    })
    .onConflictDoNothing({ target: posts.id })
    .returning({ id: posts.id });
  return row?.id ?? null;
}

export async function getPostOwner(postId: string) {
  const [row] = await db
    .select({ userId: posts.userId })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  return row?.userId ?? null;
}

export async function deletePost(userId: string, postId: string, isMaster: boolean) {
  const rows = await db
    .delete(posts)
    .where(isMaster ? eq(posts.id, postId) : and(eq(posts.id, postId), eq(posts.userId, userId)))
    .returning({ id: posts.id });
  return rows.length > 0;
}

export async function upsertReaction(userId: string, postId: string, kind: ReactionKind) {
  await db
    .insert(postReactions)
    .values({ postId, userId, kind })
    .onConflictDoUpdate({ target: [postReactions.postId, postReactions.userId], set: { kind } });
}

export async function deleteReaction(userId: string, postId: string) {
  await db
    .delete(postReactions)
    .where(and(eq(postReactions.postId, postId), eq(postReactions.userId, userId)));
}
