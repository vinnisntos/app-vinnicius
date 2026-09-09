import { z } from "zod";
import { CARD_CATEGORIES, CARD_PRIORITIES } from "./calculations";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const createCardSchema = z.object({
  columnId: z.uuid(),
  title: z.string().trim().min(1, "Dê um título ao cartão.").max(200),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(CARD_CATEGORIES),
  priority: z.enum(CARD_PRIORITIES).default("media"),
  dueDate: isoDate.optional(),
});
export type CreateCardInput = z.infer<typeof createCardSchema>;

export const updateCardSchema = createCardSchema.extend({
  id: z.uuid(),
});
export type UpdateCardInput = z.infer<typeof updateCardSchema>;

export const deleteCardSchema = z.object({
  id: z.uuid(),
});
export type DeleteCardInput = z.infer<typeof deleteCardSchema>;

export const toggleCardCompletionSchema = z.object({
  id: z.uuid(),
  completed: z.boolean(),
});
export type ToggleCardCompletionInput = z.infer<typeof toggleCardCompletionSchema>;

export const moveCardSchema = z.object({
  cardId: z.uuid(),
  toColumnId: z.uuid(),
  toIndex: z.number().int().min(0),
});
export type MoveCardInput = z.infer<typeof moveCardSchema>;

export const createColumnSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome à coluna.").max(60),
});
export type CreateColumnInput = z.infer<typeof createColumnSchema>;

export const renameColumnSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Dê um nome à coluna.").max(60),
});
export type RenameColumnInput = z.infer<typeof renameColumnSchema>;

export const reorderColumnsSchema = z.object({
  orderedIds: z.array(z.uuid()).min(1),
});
export type ReorderColumnsInput = z.infer<typeof reorderColumnsSchema>;
