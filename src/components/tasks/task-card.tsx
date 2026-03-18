import Link from "next/link";
import { Eye, Paperclip, Pencil } from "lucide-react";
import { useRef, type ChangeEvent } from "react";

import { HighlightedText } from "@/components/shared/highlighted-text";
import { TaskDeleteDialog } from "@/components/tasks/task-delete-dialog";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, stripHtml, truncateText } from "@/lib/utils";
import type { TaskListItem } from "@/types/task";

export function TaskCard({
  isSelected = false,
  onSelectionChange,
  task,
  searchTerm,
}: {
  task: TaskListItem;
  searchTerm?: string;
  isSelected?: boolean;
  onSelectionChange?: (checked: boolean, shiftKey: boolean) => void;
}) {
  const shiftKeyRef = useRef(false);

  const handleSelectionChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSelectionChange?.(event.target.checked, shiftKeyRef.current);
    shiftKeyRef.current = false;
  };

  const reportText = task.dailyReport
    ? truncateText(stripHtml(task.dailyReport), 120)
    : null;
  const savedTimeLabel = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(task.createdAt));

  return (
    <div
      className={cn(
        "group rounded-2xl border bg-card shadow-soft transition-all hover:shadow-md",
        isSelected
          ? "border-primary/40 ring-2 ring-primary/15"
          : "border-border/60 hover:border-border",
      )}
    >
      <div className="p-5">
        {/* Top row: checkbox + ticket # + status + actions */}
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <label className="mt-0.5 flex shrink-0 cursor-pointer items-center">
            <input
              checked={isSelected}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              onChange={handleSelectionChange}
              onClick={(e) => { shiftKeyRef.current = e.shiftKey; }}
              type="checkbox"
            />
            <span className="sr-only">Select task</span>
          </label>

          {/* Content */}
          <div className="min-w-0 flex-1 space-y-3">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {task.ticketNumber}
              </span>
              {task.storyPoint !== null && (
                <span className="inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-xs text-muted-foreground">
                  {task.storyPoint} SP
                </span>
              )}
              {task.attachmentsCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-xs text-accent">
                  <Paperclip className="h-3 w-3" />
                  {task.attachmentsCount}
                </span>
              )}
              <span className="inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-xs text-muted-foreground">
                {savedTimeLabel}
              </span>
              <TaskStatusBadge status={task.status} />
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold leading-snug">
              <Link
                className="transition hover:text-primary"
                href={`/dashboard/tasks/${task.id}`}
              >
                <HighlightedText query={searchTerm} text={task.ticketTitle} />
              </Link>
            </h3>

            {/* Tags */}
            {task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    className="border-transparent text-[11px] px-2 py-0"
                    style={{
                      backgroundColor: `${tag.color ?? "#cbd5e1"}25`,
                      color: tag.color ?? "#475569",
                    }}
                    variant="outline"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Description / report preview */}
            {task.ticketDescription && (
              <p className="text-sm text-muted-foreground">
                <HighlightedText
                  query={searchTerm}
                  text={truncateText(task.ticketDescription, 140)}
                />
              </p>
            )}
            {reportText && (
              <p className="text-sm italic text-muted-foreground/70">
                &ldquo;{reportText}&rdquo;
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button asChild size="icon" variant="ghost" className="h-8 w-8">
              <Link href={`/dashboard/tasks/${task.id}`}>
                <Eye className="h-3.5 w-3.5" />
                <span className="sr-only">View</span>
              </Link>
            </Button>
            <Button asChild size="icon" variant="ghost" className="h-8 w-8">
              <Link href={`/dashboard/tasks/${task.id}/edit`}>
                <Pencil className="h-3.5 w-3.5" />
                <span className="sr-only">Edit</span>
              </Link>
            </Button>
            <TaskDeleteDialog
              taskId={task.id}
              ticketNumber={task.ticketNumber}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
