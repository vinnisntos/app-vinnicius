import { apiRoute, created } from "@/lib/api/handler";
import { createPostSchema } from "@/lib/modules/comunidade/schema";
import { createPost } from "@/lib/modules/comunidade/service";

/** POST /api/community/posts — `PostInsert` → `FeedPost` (201). */
export const POST = apiRoute({ guard: "access" }, async ({ userId, access, body }) =>
  created(await createPost(userId, access, await body(createPostSchema))),
);
