"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { History } from "lucide-react";
import { toast } from "sonner";

import { TaskAttachmentsManager } from "@/components/tasks/task-attachments-manager";
import { TaskHistoryTimeline } from "@/components/tasks/task-history-timeline";
import { TaskRichTextEditor } from "@/components/tasks/task-rich-text-editor";
import { TaskTagInput } from "@/components/tasks/task-tag-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { taskStatusSchema } from "@/lib/validations/task";
import type { TaskDetail, TaskTag } from "@/types/task";

const STORY_POINT_OPTIONS = ["", "0.5", "1", "2", "3", "5", "8", "13"];

const taskFormSchema = z.object({
  date: z.string().min(1, "Date is required."),
  ticketNumber: z.string().trim().min(1, "Ticket number is required."),
  ticketTitle: z.string().trim().min(1, "Ticket title is required.").max(200),
  ticketDescription: z.string().max(5000),
  storyPoint: z.string(),
  status: taskStatusSchema,
  dailyReport: z.string().max(50000),
  tags: z.array(z.string()),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

async function fetchTask(taskId: string) {
  const response = await fetch(`/api/tasks/${taskId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Unable to fetch task.");
  }

  const payload = (await response.json()) as { data: TaskDetail };
  return payload.data;
}

async function fetchTags() {
  const response = await fetch("/api/tags", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch tags.");
  }

  const payload = (await response.json()) as { data: TaskTag[] };
  return payload.data;
}

async function uploadPendingAttachments(taskId: string, files: File[]) {
  if (!files.length) {
    return;
  }

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(`/api/tasks/${taskId}/attachments`, {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Unable to upload attachments.");
  }
}

export function TaskForm({
  mode,
  taskId,
}: {
  mode: "create" | "edit";
  taskId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRouting, startTransition] = useTransition();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });
  const taskQuery = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => fetchTask(taskId!),
    enabled: mode === "edit" && Boolean(taskId),
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      ticketNumber: "",
      ticketTitle: "",
      ticketDescription: "",
      storyPoint: "",
      status: "TODO",
      dailyReport: "<p></p>",
      tags: [],
    },
  });

  useEffect(() => {
    if (taskQuery.data) {
      reset({
        date: taskQuery.data.date.slice(0, 10),
        ticketNumber: taskQuery.data.ticketNumber,
        ticketTitle: taskQuery.data.ticketTitle,
        ticketDescription: taskQuery.data.ticketDescription,
        storyPoint:
          taskQuery.data.storyPoint !== null
            ? String(taskQuery.data.storyPoint)
            : "",
        status: taskQuery.data.status,
        dailyReport: taskQuery.data.dailyReport || "<p></p>",
        tags: taskQuery.data.tags.map((tag) => tag.name),
      });
    }
  }, [reset, taskQuery.data]);

  const tags = watch("tags");
  const taskMutation = useMutation({
    mutationFn: async (values: TaskFormValues) => {
      const response = await fetch(
        mode === "create" ? "/api/tasks" : `/api/tasks/${taskId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...values,
            storyPoint: values.storyPoint ? Number(values.storyPoint) : null,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Unable to save task.");
      }

      const payload = (await response.json()) as { data: TaskDetail };

      if (pendingFiles.length) {
        await uploadPendingAttachments(payload.data.id, pendingFiles);
      }

      return payload.data;
    },
    onSuccess: async (task) => {
      setPendingFiles([]);
      toast.success(
        mode === "create"
          ? "Task created successfully."
          : "Task updated successfully.",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["task", taskId] }),
      ]);
      startTransition(() => {
        router.push(mode === "create" ? "/dashboard/tasks" : `/dashboard/tasks/${task.id}`);
        router.refresh();
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to save task.",
      );
    },
  });

  const onSubmit = handleSubmit((values) => {
    taskMutation.mutate(values);
  });

  const tagSuggestions = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);

  if (mode === "edit" && taskQuery.isLoading) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="border-white/70 bg-white/85 shadow-soft">
        <form noValidate onSubmit={onSubmit}>
          <CardContent className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-[220px_1fr_160px]">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="date">
                  Date
                </label>
                <Input id="date" type="date" {...register("date")} />
                {errors.date ? (
                  <p className="text-sm text-destructive">
                    {errors.date.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="ticketNumber">
                  Ticket number
                </label>
                <Input id="ticketNumber" {...register("ticketNumber")} />
                {errors.ticketNumber ? (
                  <p className="text-sm text-destructive">
                    {errors.ticketNumber.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="status">
                  Status
                </label>
                <select
                  className="flex h-11 w-full rounded-2xl border border-input bg-background/80 px-4 py-2 text-sm"
                  id="status"
                  {...register("status")}
                >
                  <option value="TODO">TODO</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="DONE">DONE</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="ticketTitle">
                Ticket title
              </label>
              <Input
                id="ticketTitle"
                placeholder="Short, searchable summary"
                {...register("ticketTitle")}
              />
              {errors.ticketTitle ? (
                <p className="text-sm text-destructive">
                  {errors.ticketTitle.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="storyPoint">
                    Story point
                  </label>
                  <select
                    className="flex h-11 w-full rounded-2xl border border-input bg-background/80 px-4 py-2 text-sm"
                    id="storyPoint"
                    {...register("storyPoint")}
                  >
                    {STORY_POINT_OPTIONS.map((value) => (
                      <option key={value || "blank"} value={value}>
                        {value || "None"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="ticketDescription"
                  >
                    Ticket description
                  </label>
                  <Textarea
                    id="ticketDescription"
                    placeholder="Context, acceptance notes, or implementation details"
                    {...register("ticketDescription")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <TaskTagInput
                  availableTags={tagSuggestions}
                  onChange={(nextValue) =>
                    setValue("tags", nextValue, { shouldDirty: true })
                  }
                  value={tags}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Daily report</label>
                  <span className="text-xs text-muted-foreground">
                    Stored as rich text HTML
                  </span>
                </div>
                <Controller
                  control={control}
                  name="dailyReport"
                  render={({ field }) => (
                    <TaskRichTextEditor onChange={field.onChange} value={field.value} />
                  )}
                />
                {errors.dailyReport ? (
                  <p className="text-sm text-destructive">
                    {errors.dailyReport.message}
                  </p>
                ) : null}
              </div>

              <TaskAttachmentsManager
                attachments={taskQuery.data?.attachments ?? []}
                onPendingFilesChange={setPendingFiles}
                pendingFiles={pendingFiles}
                taskId={taskId}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-6 pt-0 sm:flex-row sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild type="button" variant="ghost">
                <Link href={mode === "edit" && taskId ? `/dashboard/tasks/${taskId}` : "/dashboard/tasks"}>
                  Cancel
                </Link>
              </Button>
              {mode === "edit" && taskId ? (
                <Button asChild type="button" variant="outline">
                  <Link href={`/dashboard/tasks/${taskId}`}>
                    <History className="mr-2 h-4 w-4" />
                    View detail & history
                  </Link>
                </Button>
              ) : null}
            </div>
            <Button disabled={taskMutation.isPending || isRouting} type="submit">
              {taskMutation.isPending || isRouting
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create task"
                  : "Save changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {mode === "edit" && taskQuery.data ? (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">History</h2>
            <p className="text-sm text-muted-foreground">
              Review what changed over time without leaving the edit flow.
            </p>
          </div>
          <TaskHistoryTimeline history={taskQuery.data.history} />
        </section>
      ) : null}
    </div>
  );
}
