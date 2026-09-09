"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  isDueToday,
  isOverdue,
  type CardCategory,
  type CardPriority,
} from "@/lib/modules/estudos-trabalhos/calculations";
import type { BoardCard } from "@/lib/modules/estudos-trabalhos/repository";
import { CardFormDialog } from "./card-form-dialog";

const CATEGORY_LABELS: Record<CardCategory, string> = {
  faculdade: "Faculdade",
  estagio: "Estágio",
  projeto_pessoal: "Projeto pessoal",
};

const CATEGORY_CLASSES: Record<CardCategory, string> = {
  faculdade: "border-blue-400/30 text-blue-400",
  estagio: "border-brand-500/30 text-brand-400",
  projeto_pessoal: "border-success-500/30 text-success-500",
};

const PRIORITY_LABELS: Record<CardPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

const PRIORITY_CLASSES: Record<CardPriority, string> = {
  baixa: "border-white/10 text-muted-foreground",
  media: "border-brand-500/30 text-brand-400",
  alta: "border-danger-500/30 text-red-400",
};

function formatDayMonth(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

function CardContent({ card, todayIso }: { card: BoardCard; todayIso: string }) {
  const overdue = isOverdue(card.dueDate, card.completedAt, todayIso);
  const dueToday = isDueToday(card.dueDate, todayIso);
  const isCompleted = Boolean(card.completedAt);

  return (
    <div className="flex flex-col gap-2">
      <p
        className={cn(
          "text-sm font-medium",
          isCompleted && "text-muted-foreground line-through",
        )}
      >
        {card.title}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={CATEGORY_CLASSES[card.category]}>
          {CATEGORY_LABELS[card.category]}
        </Badge>
        <Badge variant="outline" className={PRIORITY_CLASSES[card.priority]}>
          {PRIORITY_LABELS[card.priority]}
        </Badge>
      </div>
      {card.dueDate ? (
        <p
          className={cn(
            "font-mono text-xs",
            overdue
              ? "text-danger-500"
              : dueToday
                ? "text-brand-400"
                : "text-muted-foreground",
          )}
        >
          {overdue ? "Atrasado · " : dueToday ? "Hoje · " : ""}
          {formatDayMonth(card.dueDate)}
        </p>
      ) : null}
    </div>
  );
}

export function KanbanCard({
  card,
  todayIso,
  isOverlay = false,
}: {
  card: BoardCard;
  todayIso: string;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  if (isOverlay) {
    return (
      <div className="rounded-lg border border-white/10 bg-background p-3 shadow-lg">
        <CardContent card={card} todayIso={todayIso} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-lg border border-white/10 bg-background p-3 touch-none",
        isDragging && "opacity-40",
      )}
    >
      <CardFormDialog columnId={card.columnId} card={card}>
        <div className="cursor-pointer">
          <CardContent card={card} todayIso={todayIso} />
        </div>
      </CardFormDialog>
    </div>
  );
}
