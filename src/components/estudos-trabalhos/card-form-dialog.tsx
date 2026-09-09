"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createCard,
  deleteCard,
  toggleCardCompletion,
  updateCard,
} from "@/lib/modules/estudos-trabalhos/actions";
import {
  CARD_CATEGORIES,
  CARD_PRIORITIES,
  type CardCategory,
  type CardPriority,
} from "@/lib/modules/estudos-trabalhos/calculations";
import type { BoardCard } from "@/lib/modules/estudos-trabalhos/repository";

const CATEGORY_LABELS: Record<CardCategory, string> = {
  faculdade: "Faculdade",
  estagio: "Estágio",
  projeto_pessoal: "Projeto pessoal",
};

const PRIORITY_LABELS: Record<CardPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export function CardFormDialog({
  columnId,
  card,
  children,
}: {
  columnId: string;
  card?: BoardCard;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(card?.title ?? "");
  const [description, setDescription] = useState(card?.description ?? "");
  const [category, setCategory] = useState<CardCategory>(card?.category ?? "faculdade");
  const [priority, setPriority] = useState<CardPriority>(card?.priority ?? "media");
  const [dueDate, setDueDate] = useState(card?.dueDate ?? "");
  const [completed, setCompleted] = useState(Boolean(card?.completedAt));
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setTitle(card?.title ?? "");
    setDescription(card?.description ?? "");
    setCategory(card?.category ?? "faculdade");
    setPriority(card?.priority ?? "media");
    setDueDate(card?.dueDate ?? "");
    setCompleted(Boolean(card?.completedAt));
    setError(undefined);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const payload = {
        columnId,
        title,
        description: description.trim() ? description.trim() : undefined,
        category,
        priority,
        dueDate: dueDate ? dueDate : undefined,
      };

      const result = card
        ? await updateCard({ id: card.id, ...payload })
        : await createCard(payload);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (card && completed !== Boolean(card.completedAt)) {
        await toggleCardCompletion({ id: card.id, completed });
      }

      if (!card) resetForm();
      setOpen(false);
    });
  }

  function handleDelete() {
    if (!card) return;
    startTransition(async () => {
      await deleteCard({ id: card.id });
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {children ?? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start text-muted-foreground"
          >
            <Plus className="size-3.5" /> Novo cartão
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{card ? "Editar cartão" : "Novo cartão"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CardCategory)}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_CATEGORIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {CATEGORY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as CardPriority)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_PRIORITIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {PRIORITY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="dueDate">Prazo</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {card ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={completed}
                onCheckedChange={(checked) => setCompleted(checked === true)}
              />
              Concluído
            </label>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-sm border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-red-400"
            >
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Salvando…" : card ? "Salvar" : "Adicionar"}
            </Button>
            {card ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isPending}
                onClick={handleDelete}
                aria-label="Excluir cartão"
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
