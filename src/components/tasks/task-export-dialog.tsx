"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types/task";

type ExportFormat = "csv" | "json" | "pdf";

type TagOption = {
  id: string;
  name: string;
  color: string | null;
};

const EXPORT_OPTIONS: Array<{ value: ExportFormat; label: string; description: string }> = [
  {
    value: "csv",
    label: "CSV",
    description: "Spreadsheet-ready export with Excel-friendly encoding.",
  },
  {
    value: "json",
    label: "JSON",
    description: "Structured task data with tags and timestamps intact.",
  },
  {
    value: "pdf",
    label: "PDF",
    description: "Clean grouped report for sharing or archiving.",
  },
];

async function fetchEstimate(query: string, signal?: AbortSignal) {
  const response = await fetch(`/api/tasks?${query}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Unable to estimate task count.");
  }

  const payload = (await response.json()) as { total: number };
  return payload.total;
}

async function downloadFile(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Unable to export tasks.");
  }

  const blob = await response.blob();
  const header = response.headers.get("content-disposition") ?? "";
  const match = header.match(/filename="(.+)"/);
  const filename = match?.[1] ?? "daily-report-export";
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(downloadUrl);
}

export function TaskExportDialog({
  currentDate,
  currentEndDate,
  currentStartDate,
  initialStatuses,
  initialTags,
  isOpen,
  onOpenChange,
  tagOptions,
  totalTasksInView,
}: {
  currentDate?: string | null;
  currentStartDate?: string | null;
  currentEndDate?: string | null;
  initialStatuses: TaskStatus[];
  initialTags: string[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tagOptions: TagOption[];
  totalTasksInView: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [startDate, setStartDate] = useState(currentDate ?? currentStartDate ?? today);
  const [endDate, setEndDate] = useState(currentDate ?? currentEndDate ?? currentStartDate ?? today);
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>(initialStatuses);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormat("csv");
    setStartDate(currentDate ?? currentStartDate ?? today);
    setEndDate(currentDate ?? currentEndDate ?? currentStartDate ?? today);
    setSelectedStatuses(initialStatuses);
    setSelectedTags(initialTags);
  }, [
    currentDate,
    currentEndDate,
    currentStartDate,
    initialStatuses,
    initialTags,
    isOpen,
    today,
  ]);

  const estimateQueryString = useMemo(() => {
    const params = new URLSearchParams({
      page: "1",
      limit: "1",
      startDate,
      endDate,
      sortBy: "date",
      sortOrder: "desc",
    });

    selectedStatuses.forEach((status) => params.append("status", status));
    selectedTags.forEach((tag) => params.append("tags", tag));

    return params.toString();
  }, [endDate, selectedStatuses, selectedTags, startDate]);

  const estimateQuery = useQuery({
    queryKey: ["task-export-estimate", estimateQueryString],
    queryFn: ({ signal }) => fetchEstimate(estimateQueryString, signal),
    enabled: isOpen && Boolean(startDate && endDate),
  });

  const exportQueryString = useMemo(() => {
    const params = new URLSearchParams({
      format,
      startDate,
      endDate,
    });

    selectedStatuses.forEach((status) => params.append("status", status));
    selectedTags.forEach((tag) => params.append("tags", tag));

    return params.toString();
  }, [endDate, format, selectedStatuses, selectedTags, startDate]);

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export your task report</DialogTitle>
          <DialogDescription>
            Choose a format, tighten the date range, and export a clean copy of
            your reporting history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="grid gap-3 md:grid-cols-3">
            {EXPORT_OPTIONS.map((option) => (
              <button
                className={cn(
                  "rounded-[1.5rem] border border-border/70 bg-secondary/30 p-4 text-left transition hover:border-primary/30 hover:bg-background",
                  format === option.value ? "border-primary/40 bg-primary/5" : "",
                )}
                key={option.value}
                onClick={() => setFormat(option.value)}
                type="button"
              >
                <p className="font-medium">{option.label}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {option.description}
                </p>
              </button>
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="export-start-date">
                Start date
              </label>
              <Input
                id="export-start-date"
                onChange={(event) => setStartDate(event.target.value)}
                type="date"
                value={startDate}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="export-end-date">
                End date
              </label>
              <Input
                id="export-end-date"
                onChange={(event) => setEndDate(event.target.value)}
                type="date"
                value={endDate}
              />
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <p className="text-sm font-medium">Statuses</p>
              <div className="flex flex-wrap gap-2">
                {(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"] as TaskStatus[]).map((status) => (
                  <Button
                    key={status}
                    onClick={() =>
                      setSelectedStatuses((current) =>
                        current.includes(status)
                          ? current.filter((item) => item !== status)
                          : [...current, status],
                      )
                    }
                    size="sm"
                    type="button"
                    variant={selectedStatuses.includes(status) ? "default" : "outline"}
                  >
                    {status.replaceAll("_", " ")}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Tags</p>
                <Badge variant="outline">{selectedTags.length} selected</Badge>
              </div>
              <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-[1.25rem] border border-border/70 bg-secondary/25 p-3">
                {tagOptions.length ? (
                  tagOptions.map((tag) => (
                    <button
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm transition",
                        selectedTags.includes(tag.name)
                          ? "border-primary/40 bg-primary/5"
                          : "",
                      )}
                      key={tag.id}
                      onClick={() =>
                        setSelectedTags((current) =>
                          current.includes(tag.name)
                            ? current.filter((item) => item !== tag.name)
                            : [...current, tag.name],
                        )
                      }
                      type="button"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: tag.color ?? "#64748b" }}
                      />
                      {tag.name}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No tags yet. Your export can still use date and status filters.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-border/70 bg-secondary/35 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {estimateQuery.data ?? totalTasksInView} task
                  {(estimateQuery.data ?? totalTasksInView) === 1 ? "" : "s"} ready
                  to export
                </p>
                <p className="text-sm text-muted-foreground">
                  {format === "pdf"
                    ? "PDF groups tasks by date for easy sharing or archiving."
                    : "The download includes your selected filters only."}
                </p>
              </div>
              {estimateQuery.isFetching ? (
                <Badge variant="outline">
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Updating estimate
                </Badge>
              ) : null}
            </div>
          </section>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <Button asChild type="button" variant="ghost">
            <Link href={`/dashboard/tasks/print?${exportQueryString}`} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              Print preview
            </Link>
          </Button>
          <Button
            disabled={!startDate || !endDate || isDownloading}
            onClick={async () => {
              try {
                setIsDownloading(true);
                await downloadFile(`/api/tasks/export?${exportQueryString}`);
                toast.success("Your export is downloading.");
                onOpenChange(false);
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Unable to export tasks.",
                );
              } finally {
                setIsDownloading(false);
              }
            }}
            type="button"
          >
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export {format.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
