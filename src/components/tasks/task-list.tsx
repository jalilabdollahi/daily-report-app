"use client";

import Link from "next/link";
import {
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNow,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subDays,
} from "date-fns";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  Copy,
  Download,
  Loader2,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { TaskCard } from "@/components/tasks/task-card";
import { TaskExportDialog } from "@/components/tasks/task-export-dialog";
import { TaskImportDialog } from "@/components/tasks/task-import-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn, formatTaskGroupLabel } from "@/lib/utils";
import type {
  TaskSortField,
  TaskSortOrder,
  TaskStatus,
  TasksResponse,
} from "@/types/task";

type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "this-week"
  | "this-month"
  | "last-30-days"
  | "custom";

type TagOption = {
  id: string;
  name: string;
  color: string | null;
};

type DuplicatePreview = {
  date: string;
  count: number;
} | null;

const STATUS_OPTIONS: Array<{ label: string; value: TaskStatus }> = [
  { label: "Todo", value: "TODO" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Done", value: "DONE" },
  { label: "Blocked", value: "BLOCKED" },
];

const SORT_OPTIONS: Array<{ label: string; value: TaskSortField }> = [
  { label: "Date", value: "date" },
  { label: "Created At", value: "created_at" },
  { label: "Story Points", value: "story_point" },
  { label: "Ticket Number", value: "ticket_number" },
  { label: "Title", value: "ticket_title" },
];

const DATE_PRESETS: Array<{ label: string; value: DatePreset }> = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "this-week" },
  { label: "This Month", value: "this-month" },
  { label: "Last 30 Days", value: "last-30-days" },
  { label: "Custom Range", value: "custom" },
  { label: "All", value: "all" },
];

function formatDateParam(value: Date) {
  return format(value, "yyyy-MM-dd");
}

function buildTaskQueryFromParams(searchParams: URLSearchParams) {
  const params = new URLSearchParams();
  const supportedKeys = [
    "search",
    "date",
    "startDate",
    "endDate",
    "sortBy",
    "sortOrder",
    "page",
    "limit",
  ];

  supportedKeys.forEach((key) => {
    const value = searchParams.get(key);

    if (value) {
      params.set(key, value);
    }
  });

  searchParams.getAll("status").forEach((status) => {
    params.append("status", status);
  });

  searchParams.getAll("tags").forEach((tag) => {
    params.append("tags", tag);
  });

  if (!params.get("limit")) {
    params.set("limit", "20");
  }

  if (!params.get("page")) {
    params.set("page", "1");
  }

  if (!params.get("sortBy")) {
    params.set("sortBy", "date");
  }

  if (!params.get("sortOrder")) {
    params.set("sortOrder", "desc");
  }

  return params.toString();
}

async function fetchTasks(query: string, signal?: AbortSignal) {
  const response = await fetch(`/api/tasks?${query}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Unable to fetch tasks.");
  }

  return (await response.json()) as TasksResponse;
}

async function fetchTags(signal?: AbortSignal) {
  const response = await fetch("/api/tags", {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Unable to fetch tags.");
  }

  const payload = (await response.json()) as { data: TagOption[] };
  return payload.data;
}

async function fetchDuplicatePreview(signal?: AbortSignal) {
  const response = await fetch("/api/tasks/duplicate-previous", {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Unable to check the previous task day.");
  }

  const payload = (await response.json()) as { data: DuplicatePreview };
  return payload.data;
}

async function bulkDeleteTasks(taskIds: string[]) {
  const response = await fetch("/api/tasks/bulk/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ taskIds }),
  });

  const payload = (await response.json().catch(() => null)) as {
    data?: { count: number };
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Unable to delete selected tasks.");
  }

  return payload?.data ?? { count: taskIds.length };
}

async function bulkUpdateTaskStatus(taskIds: string[], status: TaskStatus) {
  const response = await fetch("/api/tasks/bulk/status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ taskIds, status }),
  });

  const payload = (await response.json().catch(() => null)) as {
    data?: { count: number; status: TaskStatus };
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Unable to update selected tasks.");
  }

  return payload?.data ?? { count: taskIds.length, status };
}

async function duplicatePreviousDay() {
  const response = await fetch("/api/tasks/duplicate-previous", {
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as {
    data?: { date: string; count: number };
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Unable to duplicate previous tasks.");
  }

  return payload?.data ?? null;
}

function buildDatePresetLabel({
  date,
  endDate,
  preset,
  startDate,
}: {
  preset: DatePreset;
  date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}) {
  if (preset === "today") {
    return "Today";
  }

  if (preset === "yesterday") {
    return "Yesterday";
  }

  if (preset === "this-week") {
    return "This Week";
  }

  if (preset === "this-month") {
    return "This Month";
  }

  if (preset === "last-30-days") {
    return "Last 30 Days";
  }

  if (date) {
    return format(new Date(`${date}T00:00:00`), "MMMM d, yyyy");
  }

  if (startDate && endDate) {
    return `${format(new Date(`${startDate}T00:00:00`), "MMM d")} - ${format(
      new Date(`${endDate}T00:00:00`),
      "MMM d, yyyy",
    )}`;
  }

  return "Custom Range";
}

function buildPresetParams(preset: DatePreset) {
  const today = startOfToday();

  if (preset === "today") {
    return { date: formatDateParam(today) };
  }

  if (preset === "yesterday") {
    return { date: formatDateParam(subDays(today, 1)) };
  }

  if (preset === "this-week") {
    return {
      startDate: formatDateParam(startOfWeek(today, { weekStartsOn: 1 })),
      endDate: formatDateParam(endOfWeek(today, { weekStartsOn: 1 })),
    };
  }

  if (preset === "this-month") {
    return {
      startDate: formatDateParam(startOfMonth(today)),
      endDate: formatDateParam(endOfMonth(today)),
    };
  }

  if (preset === "last-30-days") {
    return {
      startDate: formatDateParam(subDays(today, 29)),
      endDate: formatDateParam(today),
    };
  }

  if (preset === "custom") {
    return {
      startDate: formatDateParam(today),
      endDate: formatDateParam(today),
    };
  }

  return {};
}

function activeFilterGroupCount({
  date,
  endDate,
  startDate,
  statuses,
  tags,
}: {
  date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  statuses: string[];
  tags: string[];
}) {
  return (
    Number(Boolean(date || startDate || endDate)) +
    Number(statuses.length > 0) +
    Number(tags.length > 0)
  );
}

function updateArrayParam(
  params: URLSearchParams,
  key: "status" | "tags",
  values: string[],
) {
  params.delete(key);
  values.forEach((value) => params.append(key, value));
}

export function TaskList() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const searchParamsString = searchParams.toString();

  const queryState = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    const date = params.get("date");
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    const status = params.getAll("status");
    const tags = params.getAll("tags");
    const sortBy = (params.get("sortBy") as TaskSortField | null) ?? "date";
    const sortOrder =
      (params.get("sortOrder") as TaskSortOrder | null) ?? "desc";
    const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
    const preset = (params.get("range") as DatePreset | null) ?? "all";

    return {
      search: params.get("search") ?? "",
      date,
      startDate,
      endDate,
      status,
      tags,
      sortBy,
      sortOrder,
      page,
      preset,
    };
  }, [searchParamsString]);

  const [bulkStatus, setBulkStatus] = useState<TaskStatus>("TODO");
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(
    activeFilterGroupCount({
      date: queryState.date,
      startDate: queryState.startDate,
      endDate: queryState.endDate,
      statuses: queryState.status,
      tags: queryState.tags,
    }) > 0,
  );
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [lastSelectedTaskId, setLastSelectedTaskId] = useState<string | null>(
    null,
  );
  const [searchInput, setSearchInput] = useState(queryState.search);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchInput(queryState.search);
  }, [queryState.search]);

  const setParams = useCallback(
    (
      updater: (params: URLSearchParams) => void,
      { push = false }: { push?: boolean } = {},
    ) => {
      const params = new URLSearchParams(searchParamsString);
      updater(params);

      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

      if (nextQuery === searchParamsString) {
        return;
      }

      if (push) {
        router.push(nextUrl, { scroll: false });
        return;
      }

      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParamsString],
  );

  useEffect(() => {
    if (debouncedSearch === queryState.search) {
      return;
    }

    setParams((params) => {
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      } else {
        params.delete("search");
      }

      params.set("page", "1");
    });
  }, [debouncedSearch, queryState.search, setParams]);

  const apiQueryString = useMemo(() => {
    return buildTaskQueryFromParams(new URLSearchParams(searchParamsString));
  }, [searchParamsString]);

  const tasksQuery = useQuery({
    queryKey: ["tasks", apiQueryString],
    queryFn: ({ signal }) => fetchTasks(apiQueryString, signal),
  });
  const tagsQuery = useQuery({
    queryKey: ["task-filter-tags"],
    queryFn: ({ signal }) => fetchTags(signal),
    staleTime: 60_000,
  });
  const duplicatePreviewQuery = useQuery({
    queryKey: ["duplicate-previous-preview"],
    queryFn: ({ signal }) => fetchDuplicatePreview(signal),
    staleTime: 30_000,
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteTasks,
    onSuccess: async (data) => {
      setSelectedTaskIds([]);
      setLastSelectedTaskId(null);
      setIsBulkDeleteDialogOpen(false);
      toast.success(
        `Deleted ${data.count} task${data.count === 1 ? "" : "s"}.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
        queryClient.invalidateQueries({
          queryKey: ["duplicate-previous-preview"],
        }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to delete selected tasks.",
      );
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({
      status,
      taskIds,
    }: {
      taskIds: string[];
      status: TaskStatus;
    }) => bulkUpdateTaskStatus(taskIds, status),
    onSuccess: async (data) => {
      toast.success(
        `Updated ${data.count} task${data.count === 1 ? "" : "s"} to ${data.status
          .replaceAll("_", " ")
          .toLowerCase()}.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update selected tasks.",
      );
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicatePreviousDay,
    onSuccess: async (data) => {
      toast.success(
        data
          ? `Duplicated ${data.count} task${data.count === 1 ? "" : "s"} from ${new Date(
              data.date,
            ).toLocaleDateString("en-US", { dateStyle: "medium" })}.`
          : "Previous day duplicated.",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
        queryClient.invalidateQueries({
          queryKey: ["duplicate-previous-preview"],
        }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to duplicate previous tasks.",
      );
    },
  });

  const filteredTags = useMemo(() => {
    const tags = tagsQuery.data ?? [];

    return tags.filter((tag) =>
      tag.name.toLowerCase().includes(tagQuery.trim().toLowerCase()),
    );
  }, [tagQuery, tagsQuery.data]);

  const activeFilterCount = activeFilterGroupCount({
    date: queryState.date,
    startDate: queryState.startDate,
    endDate: queryState.endDate,
    statuses: queryState.status,
    tags: queryState.tags,
  });

  const hasAnyFilters =
    Boolean(queryState.search.trim()) ||
    activeFilterCount > 0 ||
    queryState.sortBy !== "date" ||
    queryState.sortOrder !== "desc";

  const selectedDateLabel =
    queryState.date || queryState.startDate || queryState.endDate
      ? buildDatePresetLabel({
          preset: queryState.preset,
          date: queryState.date,
          startDate: queryState.startDate,
          endDate: queryState.endDate,
        })
      : null;

  const totalTasks = tasksQuery.data?.total ?? 0;
  const groups = useMemo(() => tasksQuery.data?.data ?? [], [tasksQuery.data]);
  const visibleTaskIds = useMemo(
    () => groups.flatMap((group) => group.tasks.map((task) => task.id)),
    [groups],
  );
  const visibleTaskIdSet = useMemo(
    () => new Set(visibleTaskIds),
    [visibleTaskIds],
  );
  const selectedVisibleCount = useMemo(
    () =>
      selectedTaskIds.filter((taskId) => visibleTaskIdSet.has(taskId)).length,
    [selectedTaskIds, visibleTaskIdSet],
  );
  const areAllVisibleSelected =
    visibleTaskIds.length > 0 && selectedVisibleCount === visibleTaskIds.length;

  useEffect(() => {
    setSelectedTaskIds((current) =>
      current.filter((taskId) => visibleTaskIdSet.has(taskId)),
    );
    setLastSelectedTaskId((current) =>
      current && visibleTaskIdSet.has(current) ? current : null,
    );
  }, [visibleTaskIdSet]);

  const handlePresetChange = (preset: DatePreset) => {
    setParams((params) => {
      params.delete("date");
      params.delete("startDate");
      params.delete("endDate");
      params.set("page", "1");

      if (preset === "all") {
        params.delete("range");
        return;
      }

      params.set("range", preset);
      const nextValues = buildPresetParams(preset);

      if ("date" in nextValues && nextValues.date) {
        params.set("date", nextValues.date);
      }

      if ("startDate" in nextValues && nextValues.startDate) {
        params.set("startDate", nextValues.startDate);
      }

      if ("endDate" in nextValues && nextValues.endDate) {
        params.set("endDate", nextValues.endDate);
      }
    });
  };

  const handleCustomRangeChange = (
    key: "startDate" | "endDate",
    value: string,
  ) => {
    setParams((params) => {
      params.delete("date");
      params.set("range", "custom");
      params.set("page", "1");

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
  };

  const toggleStatus = (status: TaskStatus) => {
    const nextStatuses = queryState.status.includes(status)
      ? queryState.status.filter((item) => item !== status)
      : [...queryState.status, status];

    setParams((params) => {
      updateArrayParam(params, "status", nextStatuses);
      params.set("page", "1");
    });
  };

  const toggleTag = (tagName: string) => {
    const nextTags = queryState.tags.includes(tagName)
      ? queryState.tags.filter((item) => item !== tagName)
      : [...queryState.tags, tagName];

    setParams((params) => {
      updateArrayParam(params, "tags", nextTags);
      params.set("page", "1");
    });
  };

  const clearAllFilters = () => {
    setSearchInput("");
    router.replace(pathname, { scroll: false });
  };

  const handleSelectTask = (
    taskId: string,
    checked: boolean,
    shiftKey: boolean,
  ) => {
    setSelectedTaskIds((current) => {
      if (shiftKey && lastSelectedTaskId) {
        const startIndex = visibleTaskIds.indexOf(lastSelectedTaskId);
        const endIndex = visibleTaskIds.indexOf(taskId);

        if (startIndex >= 0 && endIndex >= 0) {
          const [from, to] =
            startIndex < endIndex
              ? [startIndex, endIndex]
              : [endIndex, startIndex];
          const rangeIds = visibleTaskIds.slice(from, to + 1);
          const nextIds = new Set(current);

          rangeIds.forEach((id) => {
            if (checked) {
              nextIds.add(id);
            } else {
              nextIds.delete(id);
            }
          });

          return Array.from(nextIds);
        }
      }

      const nextIds = new Set(current);

      if (checked) {
        nextIds.add(taskId);
      } else {
        nextIds.delete(taskId);
      }

      return Array.from(nextIds);
    });
    setLastSelectedTaskId(taskId);
  };

  const toggleSelectAllVisible = () => {
    if (areAllVisibleSelected) {
      setSelectedTaskIds([]);
      setLastSelectedTaskId(null);
      return;
    }

    setSelectedTaskIds(visibleTaskIds);
    setLastSelectedTaskId(visibleTaskIds[0] ?? null);
  };

  if (tasksQuery.isLoading) {
    return (
      <div className="space-y-6">
        <TaskToolbarSkeleton />
        {Array.from({ length: 3 }).map((_, index) => (
          <Card className="border-white/70 bg-white/80 shadow-soft" key={index}>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-72" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (tasksQuery.isError) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6 text-sm text-destructive">
          {tasksQuery.error instanceof Error
            ? tasksQuery.error.message
            : "Something went wrong. Please try again."}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-8 pb-28">
        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="relative w-full 2xl:max-w-xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search tasks"
                  className="pl-11 pr-11"
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search ticket numbers, titles, descriptions, or report notes..."
                  value={searchInput}
                />
                {searchInput ? (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                    onClick={() => setSearchInput("")}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Clear search</span>
                  </button>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setIsExportDialogOpen(true)}
                    type="button"
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button
                    onClick={() => setIsImportDialogOpen(true)}
                    type="button"
                    variant="outline"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                </div>

                <Button
                  disabled={
                    !duplicatePreviewQuery.data || duplicateMutation.isPending
                  }
                  onClick={() => duplicateMutation.mutate()}
                  type="button"
                  variant="outline"
                >
                  {duplicateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  Duplicate previous day
                </Button>

                <Button
                  onClick={() => setIsFilterPanelOpen((current) => !current)}
                  type="button"
                  variant="outline"
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 ? (
                    <Badge className="ml-2 bg-primary/10 text-primary">
                      {activeFilterCount}
                    </Badge>
                  ) : null}
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                  <label
                    className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                    htmlFor="task-sort-by"
                  >
                    Sort
                  </label>
                  <div className="relative">
                    <select
                      className="h-11 rounded-full border border-input bg-background/80 px-4 pr-10 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                      id="task-sort-by"
                      onChange={(event) =>
                        setParams((params) => {
                          params.set("sortBy", event.target.value);
                          params.set("page", "1");
                        })
                      }
                      value={queryState.sortBy}
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <Button
                    onClick={() =>
                      setParams((params) => {
                        params.set(
                          "sortOrder",
                          queryState.sortOrder === "desc" ? "asc" : "desc",
                        );
                        params.set("page", "1");
                      })
                    }
                    type="button"
                    variant="outline"
                  >
                    <ArrowDownUp className="mr-2 h-4 w-4" />
                    {queryState.sortOrder === "desc"
                      ? "Descending"
                      : "Ascending"}
                  </Button>
                </div>
              </div>
            </div>

            {duplicatePreviewQuery.data ? (
              <div className="flex flex-col gap-2 rounded-[1.5rem] border border-border/70 bg-secondary/35 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Ready to duplicate {duplicatePreviewQuery.data.count} task
                    {duplicatePreviewQuery.data.count === 1 ? "" : "s"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last activity day was{" "}
                    {new Date(
                      duplicatePreviewQuery.data.date,
                    ).toLocaleDateString("en-US", {
                      dateStyle: "full",
                    })}{" "}
                    (
                    {formatDistanceToNow(
                      new Date(duplicatePreviewQuery.data.date),
                      {
                        addSuffix: true,
                      },
                    )}
                    ). This shortcut only works when today is still empty.
                  </p>
                </div>
                <Badge variant="outline">
                  {duplicatePreviewQuery.data.count} ready to copy
                </Badge>
              </div>
            ) : null}

            {isFilterPanelOpen ? (
              <div className="grid gap-5 rounded-[1.75rem] border border-border/70 bg-secondary/35 p-4 lg:grid-cols-[1.1fr_0.9fr_1fr]">
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Date range</p>
                    {selectedDateLabel ? (
                      <Badge variant="outline">{selectedDateLabel}</Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DATE_PRESETS.map((preset) => (
                      <Button
                        className="rounded-full"
                        key={preset.value}
                        onClick={() => handlePresetChange(preset.value)}
                        size="sm"
                        type="button"
                        variant={
                          queryState.preset === preset.value ||
                          (preset.value === "all" &&
                            !queryState.date &&
                            !queryState.startDate &&
                            !queryState.endDate)
                            ? "default"
                            : "outline"
                        }
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      onChange={(event) =>
                        handleCustomRangeChange("startDate", event.target.value)
                      }
                      type="date"
                      value={queryState.startDate ?? ""}
                    />
                    <Input
                      onChange={(event) =>
                        handleCustomRangeChange("endDate", event.target.value)
                      }
                      type="date"
                      value={queryState.endDate ?? ""}
                    />
                  </div>
                </section>

                <section className="space-y-3">
                  <p className="text-sm font-medium">Status</p>
                  <div className="grid gap-2">
                    {STATUS_OPTIONS.map((option) => (
                      <label
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm transition",
                          queryState.status.includes(option.value)
                            ? "border-primary/40 bg-primary/5"
                            : "",
                        )}
                        key={option.value}
                      >
                        <Checkbox
                          checked={queryState.status.includes(option.value)}
                          onCheckedChange={() => toggleStatus(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Tags</p>
                    <Badge variant="outline">
                      {queryState.tags.length} selected
                    </Badge>
                  </div>
                  <Input
                    onChange={(event) => setTagQuery(event.target.value)}
                    placeholder="Search tags..."
                    value={tagQuery}
                  />
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {tagsQuery.isLoading ? (
                      Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton className="h-10 w-full" key={index} />
                      ))
                    ) : filteredTags.length ? (
                      filteredTags.map((tag) => (
                        <button
                          className={cn(
                            "flex w-full items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-left text-sm transition hover:border-primary/30 hover:bg-background",
                            queryState.tags.includes(tag.name)
                              ? "border-primary/40 bg-primary/5"
                              : "",
                          )}
                          key={tag.id}
                          onClick={() => toggleTag(tag.name)}
                          type="button"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: tag.color ?? "#64748b",
                              }}
                            />
                            {tag.name}
                          </span>
                          <span
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-md border border-input text-primary transition",
                              queryState.tags.includes(tag.name)
                                ? "border-primary bg-primary text-primary-foreground"
                                : "bg-background",
                            )}
                          >
                            {queryState.tags.includes(tag.name) ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : null}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                        No tags match that search.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            ) : null}

            {selectedDateLabel ||
            queryState.status.length ||
            queryState.tags.length ? (
              <div className="flex flex-wrap items-center gap-2">
                {selectedDateLabel ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm"
                    onClick={() =>
                      setParams((params) => {
                        params.delete("date");
                        params.delete("startDate");
                        params.delete("endDate");
                        params.delete("range");
                        params.set("page", "1");
                      })
                    }
                    type="button"
                  >
                    {selectedDateLabel}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}

                {queryState.status.map((status) => (
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm"
                    key={status}
                    onClick={() => toggleStatus(status as TaskStatus)}
                    type="button"
                  >
                    {status.replaceAll("_", " ")}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}

                {queryState.tags.map((tag) => {
                  const tagMeta = tagsQuery.data?.find(
                    (item) => item.name === tag,
                  );

                  return (
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      type="button"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: tagMeta?.color ?? "#64748b",
                        }}
                      />
                      {tag}
                      <X className="h-3.5 w-3.5" />
                    </button>
                  );
                })}

                {activeFilterCount > 0 ? (
                  <Button
                    onClick={clearAllFilters}
                    type="button"
                    variant="ghost"
                  >
                    Clear all filters
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {queryState.search.trim()
                ? `Found ${totalTasks} task${totalTasks === 1 ? "" : "s"} matching "${queryState.search.trim()}"`
                : `${totalTasks} task${totalTasks === 1 ? "" : "s"} in view`}
            </p>
            <p className="text-sm text-muted-foreground">
              Search, filter, and sort are all server-side, so shared links open
              to the same view.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {groups.length ? (
              <Button
                onClick={toggleSelectAllVisible}
                type="button"
                variant="outline"
              >
                {areAllVisibleSelected ? "Deselect page" : "Select page"}
              </Button>
            ) : null}
            {selectedVisibleCount > 0 ? (
              <Badge className="bg-primary/10 text-primary">
                {selectedVisibleCount} selected
              </Badge>
            ) : null}
            {queryState.search.trim() ? (
              <Button
                onClick={() => {
                  setSearchInput("");
                  setParams((params) => {
                    params.delete("search");
                    params.set("page", "1");
                  });
                }}
                type="button"
                variant="outline"
              >
                Clear search
              </Button>
            ) : null}
          </div>
        </div>

        {selectedVisibleCount > 0 ? (
          <div className="rounded-[1.75rem] border border-primary/20 bg-background/95 p-4 shadow-soft backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="font-medium">
                  {selectedVisibleCount} task
                  {selectedVisibleCount === 1 ? "" : "s"} selected
                </p>
                <p className="text-sm text-muted-foreground">
                  Use shift-click to select a range, then update status or
                  delete the batch together.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative">
                  <select
                    className="h-11 rounded-full border border-input bg-background/80 px-4 pr-10 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(event) =>
                      setBulkStatus(event.target.value as TaskStatus)
                    }
                    value={bulkStatus}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>

                <Button
                  disabled={bulkStatusMutation.isPending}
                  onClick={() =>
                    bulkStatusMutation.mutate({
                      taskIds: selectedTaskIds,
                      status: bulkStatus,
                    })
                  }
                  type="button"
                >
                  {bulkStatusMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Update status
                </Button>

                <Button
                  className="border-destructive/20 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                  type="button"
                  variant="outline"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete selected
                </Button>

                <Button
                  onClick={() => {
                    setSelectedTaskIds([]);
                    setLastSelectedTaskId(null);
                  }}
                  type="button"
                  variant="ghost"
                >
                  Clear selection
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {!groups.length ? (
          <Card className="border-dashed border-border/70 bg-white/70 shadow-soft">
            <CardContent className="space-y-4 p-8 text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">
                  {hasAnyFilters
                    ? "No tasks match your filters"
                    : "No tasks logged yet"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {hasAnyFilters
                    ? "Try adjusting your search, filters, or sort order to widen the results."
                    : "You have not created any tasks yet. Start with your first task and the reporting timeline will grow from there."}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {hasAnyFilters ? (
                  <Button
                    onClick={clearAllFilters}
                    type="button"
                    variant="outline"
                  >
                    Reset view
                  </Button>
                ) : null}
                <Button asChild>
                  <Link href="/dashboard/tasks/new">Create task</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {groups.map((group) => (
              <section className="space-y-4" key={group.date}>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold">
                      {formatTaskGroupLabel(group.date)}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(`${group.date}T00:00:00`),
                        "MMMM d, yyyy",
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge variant="outline">
                      {group.tasks.length} task
                      {group.tasks.length === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant="accent">
                      {group.tasks.reduce(
                        (total, task) => total + (task.storyPoint ?? 0),
                        0,
                      )}{" "}
                      story points
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-4">
                  {group.tasks.map((task) => (
                    <TaskCard
                      isSelected={selectedTaskIds.includes(task.id)}
                      key={task.id}
                      onSelectionChange={(checked, shiftKey) =>
                        handleSelectTask(task.id, checked, shiftKey)
                      }
                      searchTerm={queryState.search}
                      task={task}
                    />
                  ))}
                </div>
              </section>
            ))}

            <div className="flex items-center justify-between gap-4">
              <Button
                disabled={queryState.page === 1}
                onClick={() =>
                  setParams(
                    (params) => {
                      params.set("page", String(queryState.page - 1));
                    },
                    { push: true },
                  )
                }
                variant="outline"
              >
                Previous
              </Button>
              <p className="text-sm text-muted-foreground">
                Page {tasksQuery.data?.page ?? 1} of{" "}
                {tasksQuery.data?.totalPages ?? 1}
              </p>
              <Button
                disabled={queryState.page >= (tasksQuery.data?.totalPages ?? 1)}
                onClick={() =>
                  setParams(
                    (params) => {
                      params.set("page", String(queryState.page + 1));
                    },
                    { push: true },
                  )
                }
                variant="outline"
              >
                Next
              </Button>
            </div>
          </>
        )}
      </div>

      <AlertDialog
        onOpenChange={setIsBulkDeleteDialogOpen}
        open={isBulkDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedVisibleCount} selected task
              {selectedVisibleCount === 1 ? "" : "s"} from your active list and
              record the delete in task history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                bulkDeleteMutation.mutate(selectedTaskIds);
              }}
            >
              {bulkDeleteMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete selected"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskExportDialog
        currentDate={queryState.date}
        currentEndDate={queryState.endDate}
        currentStartDate={queryState.startDate}
        initialStatuses={queryState.status as TaskStatus[]}
        initialTags={queryState.tags}
        isOpen={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        tagOptions={tagsQuery.data ?? []}
        totalTasksInView={totalTasks}
      />

      <TaskImportDialog
        isOpen={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />
    </>
  );
}

function TaskToolbarSkeleton() {
  return (
    <Card className="border-white/70 bg-white/80 shadow-soft">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <Skeleton className="h-11 w-full xl:max-w-xl" />
          <div className="flex gap-3">
            <Skeleton className="h-11 w-44" />
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 w-40" />
            <Skeleton className="h-11 w-36" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full" />
      </CardContent>
    </Card>
  );
}
