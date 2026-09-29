import { apiRoute, created } from "@/lib/api/handler";
import { toFaqItemRow } from "@/lib/api/mappers";
import * as repository from "@/lib/modules/admin/repository";
import { faqItemSchema } from "@/lib/modules/admin/schema";

/** Todos os itens, inclusive rascunhos (is_published = false). */
export const GET = apiRoute({ guard: "master" }, async () =>
  (await repository.listAllFaq()).map(toFaqItemRow),
);

export const POST = apiRoute({ guard: "master" }, async ({ body }) =>
  created(toFaqItemRow(await repository.createFaqItem(await body(faqItemSchema)))),
);
