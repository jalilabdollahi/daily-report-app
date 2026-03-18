import { BookCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
        <BookCheck className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold tracking-wide">Daily Report App</p>
        <p className="text-xs text-muted-foreground">Work reporting platform</p>
      </div>
    </div>
  );
}
