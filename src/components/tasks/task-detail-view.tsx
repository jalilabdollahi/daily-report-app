"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";

import { TaskAttachmentGallery } from "@/components/tasks/task-attachment-gallery";
import { TaskDeleteDialog } from "@/components/tasks/task-delete-dialog";
import { TaskHistoryTimeline } from "@/components/tasks/task-history-timeline";
import { TaskRichContent } from "@/components/tasks/task-rich-content";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDisplayDateTime } from "@/lib/utils";
import type { TaskDetail } from "@/types/task";

async function fetchTask(taskId: string) {
  const response = await fetch(`/api/tasks/${taskId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Unable to load task.");
  }

  const payload = (await response.json()) as { data: TaskDetail };
  return payload.data;
}

export function TaskDetailView({ taskId }: { taskId: string }) {
  const taskQuery = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => fetchTask(taskId),
  });

  if (taskQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (taskQuery.isError || !taskQuery.data) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6 text-sm text-destructive">
          {taskQuery.error instanceof Error
            ? taskQuery.error.message
            : "Unable to load task."}
        </CardContent>
      </Card>
    );
  }

  const task = taskQuery.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button asChild type="button" variant="ghost">
          <Link href="/dashboard/tasks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to tasks
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href={`/dashboard/tasks/${task.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit task
            </Link>
          </Button>
          <TaskDeleteDialog taskId={task.id} ticketNumber={task.ticketNumber} />
        </div>
      </div>

      <Card className="border-white/70 bg-white/85 shadow-soft">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Badge className="w-fit bg-primary/10 text-primary">
                {task.ticketNumber}
              </Badge>
              <CardTitle className="text-3xl">{task.ticketTitle}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Created {formatDisplayDateTime(task.createdAt)} · Updated{" "}
                {formatDisplayDateTime(task.updatedAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TaskStatusBadge status={task.status} />
              {task.storyPoint !== null ? (
                <Badge variant="outline">{task.storyPoint} SP</Badge>
              ) : null}
              <Badge variant="accent">{task.attachments.length} attachments</Badge>
            </div>
          </div>
          {task.tags.length ? (
            <div className="flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <Badge
                  className="border-transparent"
                  key={tag.id}
                  style={{
                    backgroundColor: `${tag.color ?? "#cbd5e1"}20`,
                    color: tag.color ?? "#475569",
                  }}
                  variant="outline"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Task date
              </p>
              <p className="mt-2 text-lg font-medium">
                {new Date(task.date).toLocaleDateString("en-US", {
                  dateStyle: "full",
                })}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Description
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {task.ticketDescription || "No ticket description added."}
              </p>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Daily report
            </p>
            <TaskRichContent className="mt-4" value={task.dailyReport} />
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Attachments</h2>
          <p className="text-sm text-muted-foreground">
            Files and images attached to this task.
          </p>
        </div>
        <TaskAttachmentGallery attachments={task.attachments} />
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Version history</h2>
          <p className="text-sm text-muted-foreground">
            A timeline of changes recorded for this task.
          </p>
        </div>
        <TaskHistoryTimeline history={task.history} />
      </section>
    </div>
  );
}
