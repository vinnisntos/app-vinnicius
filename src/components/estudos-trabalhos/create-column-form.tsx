"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createColumn } from "@/lib/modules/estudos-trabalhos/actions";

export function CreateColumnForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await createColumn({ name: trimmed });
      setName("");
      setIsOpen(false);
    });
  }

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-fit w-72 shrink-0 justify-start text-muted-foreground"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="size-4" /> Nova coluna
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-72 shrink-0 flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
    >
      <Input
        autoFocus
        placeholder="Nome da coluna"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (!name.trim()) setIsOpen(false);
        }}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending} className="flex-1">
          Adicionar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
