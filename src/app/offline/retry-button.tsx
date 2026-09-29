"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OfflineRetryButton() {
  return <Button className="mt-7 h-12 w-full" onClick={() => window.location.reload()}><RefreshCw aria-hidden /> Tentar de novo</Button>;
}
