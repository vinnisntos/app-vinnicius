"use client";

import { useState, useTransition } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { renameColumn, reorderColumns } from "@/lib/modules/estudos-trabalhos/actions";
import type { BoardColumn } from "@/lib/modules/estudos-trabalhos/repository";
import { CardFormDialog } from "./card-form-dialog";
import { KanbanCard } from "./kanban-card";

export function KanbanColumn({
  column,
  todayIso,
  isFirst,
  isLast,
  orderedColumnIds,
}: {
  column: BoardColumn;
  todayIso: string;
  isFirst: boolean;
  isLast: boolean;
  orderedColumnIds: string[];
}) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(column.name);
  const [isPending, startTransition] = useTransition();

  function handleRename() {
    setIsEditingName(false);
    const trimmed = name.trim();
    if (!trimmed || trimmed === column.name) {
      setName(column.name);
      return;
    }
    startTransition(async () => {
      await renameColumn({ id: column.id, name: trimmed });
    });
  }

  function handleMove(direction: -1 | 1) {
    const index = orderedColumnIds.indexOf(column.id);
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= orderedColumnIds.length) return;
    const next = orderedColumnIds.slice();
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    startTransition(async () => {
      await reorderColumns({ orderedIds: next });
    });
  }

  const sortedCards = column.cards.slice().sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        {isEditingName ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="h-7 text-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingName(true)}
            className="truncate text-sm font-semibold hover:text-brand-400"
          >
            {column.name}
          </button>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={isFirst || isPending}
            onClick={() => handleMove(-1)}
            aria-label="Mover coluna para a esquerda"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={isLast || isPending}
            onClick={() => handleMove(1)}
            aria-label="Mover coluna para a direita"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <SortableContext
        items={sortedCards.map((card) => card.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="flex min-h-16 flex-col gap-2">
          {sortedCards.map((card) => (
            <KanbanCard key={card.id} card={card} todayIso={todayIso} />
          ))}
        </div>
      </SortableContext>

      <CardFormDialog columnId={column.id} />
    </div>
  );
}
