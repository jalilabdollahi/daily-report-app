"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { stripHtml } from "@/lib/utils";
import type { TaskDetail } from "@/types/task";

type TaskHistoryItem = TaskDetail["history"][number];

const FIELD_LABELS: Record<string, string> = {
  date: "Date",
  ticketNumber: "Ticket number",
  ticketTitle: "Title",
  ticketDescription: "Description",
  storyPoint: "Story point",
  dailyReport: "Daily report",
  status: "Status",
  tags: "Tags",
  deletedAt: "Deleted at",
};

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Empty";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "string" && value.includes("<")) {
    return stripHtml(value) || "Empty";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export function TaskHistoryTimeline({
  history,
}: {
  history: TaskHistoryItem[];
}) {
  if (!history.length) {
    return (
      <Card className="border-dashed border-border/70 bg-white/70 shadow-soft">
        <CardContent className="p-6 text-sm text-muted-foreground">
          No history entries yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((entry) => (
        <TaskHistoryEntry entry={entry} key={entry.id} />
      ))}
    </div>
  );
}

function TaskHistoryEntry({ entry }: { entry: TaskHistoryItem }) {
  const [isExpanded, setIsExpanded] = useState(entry.action !== "CREATED");
  const diffEntries = Object.entries(
    (entry.changes as Record<string, unknown>) ?? {},
  );

  return (
    <Card className="border-white/70 bg-white/80 shadow-soft">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-medium">
              {entry.action === "CREATED"
                ? "Task created"
                : entry.action === "UPDATED"
                  ? "Task updated"
                  : "Task deleted"}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(entry.createdAt), "MMMM d, yyyy 'at' HH:mm")}
              {entry.user ? ` · ${entry.user.name}` : ""}
            </p>
          </div>
          <Button
            onClick={() => setIsExpanded((current) => !current)}
            type="button"
            variant="ghost"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Hide changes
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Show changes
              </>
            )}
          </Button>
        </div>

        {isExpanded ? (
          <div className="space-y-3">
            {diffEntries.length ? (
              diffEntries.map(([field, value]) => {
                const diffValue = value as {
                  before?: unknown;
                  after?: unknown;
                };

                return (
                  <div
                    className="rounded-2xl border border-border/70 bg-background/70 p-4"
                    key={field}
                  >
                    <p className="text-sm font-medium">
                      {FIELD_LABELS[field] ?? field}
                    </p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Before
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatValue(diffValue.before)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          After
                        </p>
                        <p className="mt-1 text-sm">
                          {formatValue(diffValue.after)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                This entry did not record field-level changes.
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
