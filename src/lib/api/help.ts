import { inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { helpTooltips } from "@/lib/db/schema";
import type { HelpKey, HelpTooltipMap } from "@/types/database";

/** Tooltips das chaves pedidas, prontos para o `help` do envelope. */
export async function getHelp(keys: readonly HelpKey[]): Promise<Partial<HelpTooltipMap>> {
  if (keys.length === 0) return {};

  const rows = await db
    .select()
    .from(helpTooltips)
    .where(inArray(helpTooltips.key, [...keys]));

  return Object.fromEntries(
    rows.map((row) => [
      row.key,
      { title: row.title, body: row.body, faq_item_id: row.faqItemId },
    ]),
  );
}
