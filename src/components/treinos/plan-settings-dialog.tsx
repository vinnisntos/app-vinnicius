"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExerciseEditor } from "./exercise-editor";
import type { DayLabel } from "@/lib/modules/treinos/calculations";
import type { WorkoutExercise } from "@/lib/db/schema";

export function PlanSettingsDialog({
  planId,
  exercisesByDay,
}: {
  planId: string;
  exercisesByDay: Record<DayLabel, WorkoutExercise[]>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Editar plano de treino">
          <Settings className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Plano de treino</DialogTitle>
        </DialogHeader>
        <ExerciseEditor planId={planId} exercisesByDay={exercisesByDay} />
      </DialogContent>
    </Dialog>
  );
}
