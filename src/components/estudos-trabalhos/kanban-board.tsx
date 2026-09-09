"use client";

import { useState, useTransition } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { moveCard } from "@/lib/modules/estudos-trabalhos/actions";
import { reorderAfterMove } from "@/lib/modules/estudos-trabalhos/calculations";
import type { BoardColumn } from "@/lib/modules/estudos-trabalhos/repository";
import { CreateColumnForm } from "./create-column-form";
import { KanbanCard } from "./kanban-card";
import { KanbanColumn } from "./kanban-column";

export function KanbanBoard({
  initialColumns,
  todayIso,
}: {
  initialColumns: BoardColumn[];
  todayIso: string;
}) {
  const [columns, setColumns] = useState(initialColumns);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // initialColumns muda a cada revalidação do Server Component (nova
  // referência a cada request) — sincroniza o estado local otimista com a
  // verdade do servidor após qualquer ação (criar cartão/coluna, renomear).
  // setState durante o render (não em efeito) é o padrão recomendado pelo
  // React para "resetar" estado quando uma prop muda de identidade.
  const [prevInitialColumns, setPrevInitialColumns] = useState(initialColumns);
  if (initialColumns !== prevInitialColumns) {
    setPrevInitialColumns(initialColumns);
    setColumns(initialColumns);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const sortedColumns = columns.slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const orderedColumnIds = sortedColumns.map((column) => column.id);
  const allCards = columns.flatMap((column) => column.cards);
  const activeCard = allCards.find((card) => card.id === activeCardId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveCardId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCardId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const overColumn = columns.find((column) => column.id === overId);
    let toColumnId: string;
    let toIndex: number;

    if (overColumn) {
      toColumnId = overColumn.id;
      toIndex = overColumn.cards.length;
    } else {
      const containingColumn = columns.find((column) =>
        column.cards.some((card) => card.id === overId),
      );
      if (!containingColumn) return;
      toColumnId = containingColumn.id;
      toIndex = containingColumn.cards
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .findIndex((card) => card.id === overId);
    }

    const positions = allCards.map((card) => ({
      id: card.id,
      columnId: card.columnId,
      orderIndex: card.orderIndex,
    }));
    const updatedPositions = reorderAfterMove(positions, activeId, toColumnId, toIndex);

    setColumns((prev) =>
      prev.map((column) => ({
        ...column,
        cards: updatedPositions
          .filter((position) => position.columnId === column.id)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((position) => {
            const card = allCards.find((c) => c.id === position.id);
            return card
              ? { ...card, columnId: position.columnId, orderIndex: position.orderIndex }
              : card;
          })
          .filter((card): card is NonNullable<typeof card> => card !== undefined),
      })),
    );

    startTransition(async () => {
      await moveCard({ cardId: activeId, toColumnId, toIndex });
    });
  }

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {sortedColumns.map((column, index) => (
          <KanbanColumn
            key={column.id}
            column={column}
            todayIso={todayIso}
            isFirst={index === 0}
            isLast={index === sortedColumns.length - 1}
            orderedColumnIds={orderedColumnIds}
          />
        ))}
        <CreateColumnForm />
      </div>
      <DragOverlay>
        {activeCard ? <KanbanCard card={activeCard} todayIso={todayIso} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
