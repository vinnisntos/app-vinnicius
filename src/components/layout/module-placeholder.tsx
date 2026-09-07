import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-white/10 bg-white/5">
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-brand-600/10 text-brand-400">
          <Icon className="size-6" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
