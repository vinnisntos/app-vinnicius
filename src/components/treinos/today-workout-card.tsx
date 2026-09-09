"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { finishSession, logSet, startSession } from "@/lib/modules/treinos/actions";
import type { DayLabel } from "@/lib/modules/treinos/calculations";
import type { WorkoutExercise, WorkoutSetLog } from "@/lib/db/schema";

function ExerciseSetRows({
  exercise,
  sessionId,
  initialSets,
}: {
  exercise: WorkoutExercise;
  sessionId: string;
  initialSets: WorkoutSetLog[];
}) {
  const bySetNumber = new Map(
    initialSets
      .filter((s) => s.exerciseId === exercise.id)
      .map((s) => [s.setNumber, s]),
  );
  const initialRows = Array.from({ length: exercise.targetSets }, (_, i) => {
    const setNumber = i + 1;
    const existing = bySetNumber.get(setNumber);
    return {
      setNumber,
      repsDone: existing ? existing.repsDone : null,
      weightKg: existing?.weightKg != null ? Number(existing.weightKg) : null,
    };
  });
  const [sets, setSets] = useState(initialRows);
  const [, startTransition] = useTransition();

  function persist(index: number) {
    const set = sets[index];
    if (set.repsDone == null) return;
    startTransition(async () => {
      await logSet({
        sessionId,
        exerciseId: exercise.id,
        setNumber: set.setNumber,
        repsDone: set.repsDone!,
        weightKg: set.weightKg ?? undefined,
      });
    });
  }

  return (
    <div className="rounded-lg border border-white/10 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-medium">{exercise.name}</p>
        <p className="text-xs text-muted-foreground">
          meta: {exercise.targetSets}x{exercise.targetReps}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {sets.map((set, index) => (
          <div key={set.setNumber} className="flex items-center gap-2">
            <span className="w-16 text-xs text-muted-foreground">
              Série {set.setNumber}
            </span>
            <Input
              type="number"
              placeholder="reps"
              min={0}
              value={set.repsDone ?? ""}
              onChange={(e) => {
                const value = e.target.value === "" ? null : Number(e.target.value);
                setSets((prev) =>
                  prev.map((s, i) => (i === index ? { ...s, repsDone: value } : s)),
                );
              }}
              onBlur={() => persist(index)}
              className="w-20"
            />
            <Input
              type="number"
              placeholder="kg (opcional)"
              min={0}
              step="0.5"
              value={set.weightKg ?? ""}
              onChange={(e) => {
                const value = e.target.value === "" ? null : Number(e.target.value);
                setSets((prev) =>
                  prev.map((s, i) => (i === index ? { ...s, weightKg: value } : s)),
                );
              }}
              onBlur={() => persist(index)}
              className="w-28"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TodayWorkoutCard({
  dayLabel,
  exercises,
  planId,
  todayIso,
  session,
  initialSets,
}: {
  dayLabel: DayLabel;
  exercises: WorkoutExercise[];
  planId: string;
  todayIso: string;
  session: { id: string; notes: string | null } | null;
  initialSets: WorkoutSetLog[];
}) {
  const [notes, setNotes] = useState(session?.notes ?? "");
  const [isPending, startTransition] = useTransition();

  function handleStart() {
    startTransition(async () => {
      await startSession({ planId, dayLabel, performedAt: todayIso });
    });
  }

  function persistNotes() {
    if (!session) return;
    startTransition(async () => {
      await finishSession({ sessionId: session.id, notes: notes || undefined });
    });
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Treino de hoje: {dayLabel}</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum exercício cadastrado para o treino {dayLabel} ainda —
            configure o plano.
          </p>
        ) : !session ? (
          <>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {exercises.map((exercise) => (
                <li key={exercise.id}>
                  {exercise.name} — {exercise.targetSets}x{exercise.targetReps}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              onClick={handleStart}
              disabled={isPending}
              className="shadow-[var(--shadow-glow)]"
            >
              Iniciar treino
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {exercises.map((exercise) => (
                <ExerciseSetRows
                  key={exercise.id}
                  exercise={exercise}
                  sessionId={session.id}
                  initialSets={initialSets}
                />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="workout-notes">Notas do treino (opcional)</Label>
              <Textarea
                id="workout-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={persistNotes}
                rows={2}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
