import { apiRoute } from "@/lib/api/handler";
import * as repository from "@/lib/modules/admin/repository";
import { listSubscriptionsQuery } from "@/lib/modules/admin/schema";

/** GET /api/admin/subscriptions?state=trial&q=maria&page=1&page_size=30 */
export const GET = apiRoute({ guard: "master" }, async ({ query }) => {
  const params = query(listSubscriptionsQuery);
  const { items, total } = await repository.listSubscriptions(params);
  return { items, total, page: params.page, page_size: params.page_size };
});
