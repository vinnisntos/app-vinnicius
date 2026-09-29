import { apiRoute } from "@/lib/api/handler";
import { feedQuerySchema } from "@/lib/modules/comunidade/schema";
import { getFeedPage } from "@/lib/modules/comunidade/service";
import type { FeedPage } from "@/types/database";

/** GET /api/community/feed?cursor=&scope=community|mine → `FeedPage` */
export const GET = apiRoute(
  { guard: "access", help: ["posts.visibility"] },
  async ({ userId, access, query }): Promise<FeedPage> => getFeedPage(userId, access, query(feedQuerySchema)),
);
