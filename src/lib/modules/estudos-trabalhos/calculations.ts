export const CARD_CATEGORIES = ["faculdade", "estagio", "projeto_pessoal"] as const;
export type CardCategory = (typeof CARD_CATEGORIES)[number];

export const CARD_PRIORITIES = ["baixa", "media", "alta"] as const;
export type CardPriority = (typeof CARD_PRIORITIES)[number];

export type CardPosition = {
  id: string;
  columnId: string;
  orderIndex: number;
};

/**
 * Recalcula order_index dos cartões afetados por um drag-and-drop, sem tocar
 * no banco — o repository persiste só as linhas que este cálculo mudou.
 */
export function reorderAfterMove(
  cards: CardPosition[],
  cardId: string,
  toColumnId: string,
  toIndex: number,
): CardPosition[] {
  const moving = cards.find((card) => card.id === cardId);
  if (!moving) return cards;

  const sourceColumnId = moving.columnId;
  const others = cards.filter((card) => card.id !== cardId);

  const targetColumnCards = others
    .filter((card) => card.columnId === toColumnId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const clampedIndex = Math.max(0, Math.min(toIndex, targetColumnCards.length));
  targetColumnCards.splice(clampedIndex, 0, { ...moving, columnId: toColumnId });

  const updates = new Map<string, CardPosition>();
  targetColumnCards.forEach((card, index) => {
    updates.set(card.id, { ...card, orderIndex: index });
  });

  if (sourceColumnId !== toColumnId) {
    const sourceColumnCards = others
      .filter((card) => card.columnId === sourceColumnId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    sourceColumnCards.forEach((card, index) => {
      updates.set(card.id, { ...card, orderIndex: index });
    });
  }

  return cards.map((card) => updates.get(card.id) ?? card);
}

export function isOverdue(
  dueDate: string | null,
  completedAt: string | null,
  todayIso: string,
): boolean {
  if (!dueDate || completedAt) return false;
  return dueDate < todayIso;
}

export function isDueToday(dueDate: string | null, todayIso: string): boolean {
  return dueDate === todayIso;
}
