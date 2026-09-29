import { z } from "zod";
import { POST_VISIBILITIES, REACTION_KINDS } from "@/types/database";

export const FEED_PAGE_SIZE = 20;
/** Anti-spam simples: teto de posts por usuário a cada 24h. */
export const MAX_POSTS_PER_DAY = 20;

export const feedQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  /** "mine" = meus posts, inclusive privados (histórico pessoal). */
  scope: z.enum(["community", "mine"]).default("community"),
});

/** Espelha `PostInsert`. Precisa de texto OU refeição anexada. */
export const createPostSchema = z
  .object({
    id: z.uuid().optional(),
    body: z.string().trim().max(2000).nullable().default(null),
    meal_log_id: z.uuid().nullable().default(null),
    visibility: z.enum(POST_VISIBILITIES).default("public"),
  })
  .strict()
  .refine((v) => (v.body && v.body.length > 0) || v.meal_log_id, {
    message: "Escreva algo ou anexe uma refeição.",
    path: ["body"],
  });
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const reactionSchema = z.object({ kind: z.enum(REACTION_KINDS) }).strict();

/** Cursor opaco = base64url("<created_at ISO>|<id>") — paginação estável por (created_at, id). */
export function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | undefined): { createdAt: string; id: string } | null {
  if (!cursor) return null;
  const [createdAt, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
  if (!createdAt || !id || Number.isNaN(Date.parse(createdAt)) || !z.uuid().safeParse(id).success) {
    return null;
  }
  return { createdAt, id };
}
