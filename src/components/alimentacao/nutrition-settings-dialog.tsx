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
import {
  NutritionProfileForm,
  type NutritionProfileFormValues,
} from "./nutrition-profile-form";

export function NutritionSettingsDialog({
  defaultValues,
  trigger,
}: {
  defaultValues?: NutritionProfileFormValues;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" aria-label="Configurar perfil">
            <Settings className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurações de alimentação</DialogTitle>
        </DialogHeader>
        <NutritionProfileForm
          defaultValues={defaultValues}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
