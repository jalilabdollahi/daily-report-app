import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { TaskList } from "@/components/tasks/task-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Your daily work log, grouped by date.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/dashboard/tasks/new">
            <Plus className="h-3.5 w-3.5" />
            New task
          </Link>
        </Button>
      </div>
      <Suspense fallback={<TaskListPageFallback />}>
        <TaskList />
      </Suspense>
    </div>
  );
}

function TaskListPageFallback() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
        <Skeleton className="h-10 w-full" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <div className="flex gap-3">
            <Skeleton className="mt-1 h-4 w-4 shrink-0 rounded" />
            <div className="flex-1 space-y-2.5">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-12" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
