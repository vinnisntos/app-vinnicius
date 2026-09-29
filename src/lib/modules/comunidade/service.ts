import { ApiHttpError, notFound } from "@/lib/api/handler";
import type { AccessStatus, FeedPage, FeedPost, ReactionKind } from "@/types/database";
import * as repository from "./repository";
import {
  decodeCursor,
  encodeCursor,
  FEED_PAGE_SIZE,
  MAX_POSTS_PER_DAY,
  type CreatePostInput,
} from "./schema";

const isMaster = (access: AccessStatus) => access.access_state === "master";

export async function getFeedPage(
  viewerId: string,
  access: AccessStatus,
  query: { cursor?: string; scope: "community" | "mine" },
): Promise<FeedPage> {
  // Busca 1 a mais para saber se existe próxima página.
  const items = await repository.getFeed({
    viewerId,
    isMaster: isMaster(access),
    scope: query.scope,
    cursor: decodeCursor(query.cursor),
    limit: FEED_PAGE_SIZE + 1,
  });
  const hasMore = items.length > FEED_PAGE_SIZE;
  const page = items.slice(0, FEED_PAGE_SIZE);
  const last = page.at(-1);
  return {
    items: page,
    next_cursor: hasMore && last ? encodeCursor(last.post.created_at, last.post.id) : null,
  };
}

async function getVisiblePost(viewerId: string, access: AccessStatus, postId: string): Promise<FeedPost> {
  const [post] = await repository.getFeed({
    viewerId,
    isMaster: isMaster(access),
    scope: "community",
    cursor: null,
    limit: 1,
    postId,
  });
  // Post do próprio usuário (inclusive privado) também é "visível".
  if (post) return post;
  const [own] = await repository.getFeed({
    viewerId,
    isMaster: isMaster(access),
    scope: "mine",
    cursor: null,
    limit: 1,
    postId,
  });
  if (!own) throw notFound("Post");
  return own;
}

export async function createPost(userId: string, access: AccessStatus, input: CreatePostInput): Promise<FeedPost> {
  if (input.meal_log_id && !(await repository.ownsMealLog(userId, input.meal_log_id))) {
    // Mesma resposta de "não existe": não confirma id de refeição alheia.
    throw new ApiHttpError(422, "validation", "Refeição não encontrada.", {
      meal_log_id: ["Refeição não encontrada."],
    });
  }
  if (!isMaster(access) && (await repository.countRecentPosts(userId)) >= MAX_POSTS_PER_DAY) {
    throw new ApiHttpError(429, "rate_limited", "Limite de publicações por hoje atingido.");
  }

  const id = await repository.insertPost(userId, input);
  // Retry com o mesmo id do cliente: devolve o post já criado (idempotente),
  // desde que seja do próprio usuário.
  const postId = id ?? input.id!;
  if (!id && (await repository.getPostOwner(postId)) !== userId) {
    throw new ApiHttpError(409, "conflict", "Identificador já utilizado.");
  }
  return getVisiblePost(userId, access, postId);
}

export async function removePost(userId: string, access: AccessStatus, postId: string) {
  if (!(await repository.deletePost(userId, postId, isMaster(access)))) throw notFound("Post");
}

export async function react(userId: string, access: AccessStatus, postId: string, kind: ReactionKind | null) {
  // Só reage a post que consegue ver (público não oculto, ou próprio).
  await getVisiblePost(userId, access, postId);
  if (kind) await repository.upsertReaction(userId, postId, kind);
  else await repository.deleteReaction(userId, postId);
  return getVisiblePost(userId, access, postId);
}
