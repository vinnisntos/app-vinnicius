"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteExercise, upsertExercise } from "@/lib/modules/treinos/actions";
import type { DayLabel } from "@/lib/modules/treinos/calculations";
import type { WorkoutExercise } from "@/lib/db/schema";

function ExistingExerciseRow({ exercise }: { exercise: WorkoutExercise }) {
  const [name, setName] = useState(exercise.name);
  const [targetSets, setTargetSets] = useState(exercise.targetSets);
  const [targetReps, setTargetReps] = useState(exercise.targetReps);
  const [, startTransition] = useTransition();

  function persist() {
    startTransition(async () => {
      await upsertExercise({
        id: exercise.id,
        planId: exercise.planId,
        dayLabel: exercise.dayLabel as DayLabel,
        name,
        targetSets,
        targetReps,
        orderIndex: exercise.orderIndex,
      });
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteExercise({ id: exercise.id });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={persist}
        className="flex-1"
      />
      <Input
        type="number"
        min={1}
        value={targetSets}
        onChange={(e) => setTargetSets(Number(e.target.value))}
        onBlur={persist}
        className="w-16"
        aria-label="Séries"
      />
      <Input
        value={targetReps}
        onChange={(e) => setTargetReps(e.target.value)}
        onBlur={persist}
        className="w-20"
        aria-label="Repetições"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        aria-label="Remover exercício"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function AddExerciseForm({
  planId,
  dayLabel,
  nextOrderIndex,
}: {
  planId: string;
  dayLabel: DayLabel;
  nextOrderIndex: number;
}) {
  const [name, setName] = useState("");
  const [targetSets, setTargetSets] = useState(3);
  const [targetReps, setTargetReps] = useState("8-12");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await upsertExercise({
        planId,
        dayLabel,
        name,
        targetSets,
        targetReps,
        orderIndex: nextOrderIndex,
      });
      setName("");
      setTargetSets(3);
      setTargetReps("8-12");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        placeholder="Novo exercício"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1"
      />
      <Input
        type="number"
        min={1}
        value={targetSets}
        onChange={(e) => setTargetSets(Number(e.target.value))}
        className="w-16"
        aria-label="Séries"
      />
      <Input
        value={targetReps}
        onChange={(e) => setTargetReps(e.target.value)}
        className="w-20"
        aria-label="Repetições"
      />
      <Button type="submit" size="icon" variant="secondary" disabled={isPending}>
        <Plus className="size-4" />
      </Button>
    </form>
  );
}

export function ExerciseEditor({
  planId,
  exercisesByDay,
}: {
  planId: string;
  exercisesByDay: Record<DayLabel, WorkoutExercise[]>;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {(["A", "B"] as const).map((dayLabel) => {
        const exercises = exercisesByDay[dayLabel];
        const nextOrderIndex = exercises.length;
        return (
          <div key={dayLabel} className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Treino {dayLabel}</p>
            {exercises.map((exercise) => (
              <ExistingExerciseRow key={exercise.id} exercise={exercise} />
            ))}
            <AddExerciseForm
              planId={planId}
              dayLabel={dayLabel}
              nextOrderIndex={nextOrderIndex}
            />
          </div>
        );
      })}
    </div>
  );
}
