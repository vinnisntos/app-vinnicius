import { z } from "zod";
import { TRANSACTION_TYPES } from "./calculations";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const createTransactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  description: z.string().trim().min(1, "Descreva a transação.").max(200),
  amount: z.coerce.number().positive("Valor deve ser maior que zero.").max(1_000_000),
  occurredOn: isoDate,
  categoryId: z.uuid().optional(),
  isRecurring: z.boolean().optional().default(false),
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = createTransactionSchema.extend({
  id: z.uuid(),
});
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const deleteTransactionSchema = z.object({
  id: z.uuid(),
});
export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Dê um nome à categoria.").max(60),
  kind: z.enum(["receita", "despesa"]),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida.")
    .optional()
    .default("#a855f7"),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
