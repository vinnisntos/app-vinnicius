"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
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
import { createTransaction } from "@/lib/modules/financeiro/actions";
import type { TransactionType } from "@/lib/modules/financeiro/calculations";
import type { FinanceCategory } from "@/lib/db/schema";

const TYPE_LABELS: Record<TransactionType, string> = {
  receita_fixa: "Receita fixa",
  receita_variavel: "Receita variável",
  despesa: "Despesa",
};

export function TransactionFormDialog({
  categories,
  todayIso,
}: {
  categories: FinanceCategory[];
  todayIso: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("despesa");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayIso);
  const [categoryId, setCategoryId] = useState<string>("none");
  const [isRecurring, setIsRecurring] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const categoryKind = type === "despesa" ? "despesa" : "receita";
  const availableCategories = categories.filter((c) => c.kind === categoryKind);

  function resetForm() {
    setType("despesa");
    setDescription("");
    setAmount("");
    setOccurredOn(todayIso);
    setCategoryId("none");
    setIsRecurring(false);
    setError(undefined);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await createTransaction({
        type,
        description,
        amount: Number(amount),
        occurredOn,
        categoryId: categoryId === "none" ? undefined : categoryId,
        isRecurring,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      resetForm();
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
        <Button className="shadow-[var(--shadow-glow)]">
          <Plus className="size-4" /> Nova transação
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as TransactionType);
                setCategoryId("none");
              }}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="occurredOn">Data</Label>
              <Input
                id="occurredOn"
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isRecurring}
              onCheckedChange={(checked) => setIsRecurring(checked === true)}
            />
            Recorrente (ex.: bolsa mensal do estágio)
          </label>

          {error ? (
            <p
              role="alert"
              className="rounded-sm border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-red-400"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando…" : "Adicionar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
