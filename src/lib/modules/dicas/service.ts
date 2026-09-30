import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { toTipRow } from "@/lib/api/mappers-health";
import { db } from "@/lib/db/client";
import { tips } from "@/lib/db/schema";
import { TIP_CATEGORIES, type TipCategory, type TipRow } from "@/types/database";

/** Dicas / mentoria — conteúdo curado pelo master. */

export const tipsQuery = z.object({ category: z.enum(TIP_CATEGORIES).optional() });

export const tipSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    body: z.string().trim().min(10).max(8000),
    category: z.enum(TIP_CATEGORIES),
    read_minutes: z.number().int().min(1).max(60).default(2),
    is_published: z.boolean().default(true),
  })
  .strict();
export const updateTipSchema = tipSchema.partial().strict();

export async function listTips(category?: TipCategory): Promise<TipRow[]> {
  const rows = await db
    .select()
    .from(tips)
    .where(and(eq(tips.isPublished, true), category ? eq(tips.category, category) : undefined))
    .orderBy(desc(tips.publishedAt));
  return rows.map(toTipRow);
}

/** Listagem completa só pela rota com guard master. */
export async function listAllTips(): Promise<TipRow[]> {
  const rows = await db.select().from(tips).orderBy(desc(tips.createdAt));
  return rows.map(toTipRow);
}

/** Dica do dia: rotação determinística pelo dia do ano (todos veem a mesma). */
export function pickDailyTip<T>(items: T[], isoDate: string): T | null {
  if (items.length === 0) return null;
  const start = Date.UTC(Number(isoDate.slice(0, 4)), 0, 1);
  const dayOfYear = Math.floor((Date.parse(`${isoDate}T00:00:00Z`) - start) / 86_400_000);
  return items[dayOfYear % items.length];
}

export async function createTip(authorId: string, input: z.infer<typeof tipSchema>) {
  const [row] = await db
    .insert(tips)
    .values({
      title: input.title,
      body: input.body,
      category: input.category,
      readMinutes: input.read_minutes,
      isPublished: input.is_published,
      authorId,
    })
    .returning();
  return toTipRow(row);
}

export async function updateTip(id: string, input: z.infer<typeof updateTipSchema>) {
  const set = Object.fromEntries(
    Object.entries({
      title: input.title,
      body: input.body,
      category: input.category,
      readMinutes: input.read_minutes,
      isPublished: input.is_published,
    }).filter(([, v]) => v !== undefined),
  );
  if (Object.keys(set).length === 0) return null;
  const [row] = await db.update(tips).set(set).where(eq(tips.id, id)).returning();
  return row ? toTipRow(row) : null;
}

export async function deleteTip(id: string) {
  const rows = await db.delete(tips).where(eq(tips.id, id)).returning({ id: tips.id });
  return rows.length > 0;
}
