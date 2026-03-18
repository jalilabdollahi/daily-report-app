"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageIntro } from "@/components/shared/page-intro";
import { TaskRichContent } from "@/components/tasks/task-rich-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDisplayDateTime } from "@/lib/utils";
import type {
  AdminContentTask,
  AdminTaskDetail,
  AdminUserListItem,
} from "@/types/admin";

type ContentResponse = {
  data: AdminContentTask[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

async function fetchContent(query: string, signal?: AbortSignal) {
  const response = await fetch(`/api/admin/tasks?${query}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Unable to load tasks.");
  }

  return (await response.json()) as ContentResponse;
}

async function fetchUsers(signal?: AbortSignal) {
  const response = await fetch(
    "/api/admin/users?limit=100&page=1&sortBy=name&sortOrder=asc",
    { cache: "no-store", signal },
  );
  const payload = (await response.json()) as { data: AdminUserListItem[] };
  return payload.data;
}

async function fetchTaskDetail(taskId: string) {
  const response = await fetch(`/api/admin/tasks/${taskId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load task detail.");
  }

  const payload = (await response.json()) as { data: AdminTaskDetail };
  return payload.data;
}

function buildQuery(searchParams: URLSearchParams) {
  const params = new URLSearchParams();
  [
    "search",
    "page",
    "limit",
    "sortBy",
    "sortOrder",
    "userId",
    "status",
    "flagged",
    "startDate",
    "endDate",
  ].forEach((key) => {
    const value = searchParams.get(key);
    if (value) params.set(key, value);
  });

  if (!params.get("page")) params.set("page", "1");
  if (!params.get("limit")) params.set("limit", "20");
  if (!params.get("sortBy")) params.set("sortBy", "date");
  if (!params.get("sortOrder")) params.set("sortOrder", "desc");
  if (!params.get("flagged")) params.set("flagged", "all");

  return params.toString();
}

export function AdminContentScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const queryState = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return {
      search: params.get("search") ?? "",
      userId: params.get("userId") ?? "",
      status: params.get("status") ?? "",
      flagged: params.get("flagged") ?? "all",
      startDate: params.get("startDate") ?? "",
      endDate: params.get("endDate") ?? "",
      sortBy: params.get("sortBy") ?? "date",
      sortOrder: params.get("sortOrder") ?? "desc",
      page: Number(params.get("page") ?? "1"),
      limit: Number(params.get("limit") ?? "20"),
    };
  }, [searchParamsString]);

  const [searchInput, setSearchInput] = useState(queryState.search);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchInput(queryState.search);
  }, [queryState.search]);

  const setParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParamsString);
      updater(params);
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParamsString],
  );

  useEffect(() => {
    if (debouncedSearch === queryState.search) return;

    setParams((params) => {
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      else params.delete("search");
      params.set("page", "1");
    });
  }, [debouncedSearch, queryState.search, setParams]);

  const queryString = useMemo(
    () => buildQuery(new URLSearchParams(searchParamsString)),
    [searchParamsString],
  );
  const contentQuery = useQuery({
    queryKey: ["admin-content", queryString],
    queryFn: ({ signal }) => fetchContent(queryString, signal),
  });
  const usersQuery = useQuery({
    queryKey: ["admin-content-users"],
    queryFn: ({ signal }) => fetchUsers(signal),
    staleTime: 60_000,
  });
  const detailQuery = useQuery({
    queryKey: ["admin-task-detail", selectedTaskId],
    queryFn: () => fetchTaskDetail(selectedTaskId!),
    enabled: Boolean(selectedTaskId),
  });

  const flagMutation = useMutation({
    mutationFn: async ({
      flagged,
      taskId,
    }: {
      taskId: string;
      flagged: boolean;
    }) => {
      const response = await fetch(`/api/admin/tasks/${taskId}/flag`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ flagged }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to update flag.");
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-content"] }),
        queryClient.invalidateQueries({
          queryKey: ["admin-task-detail", selectedTaskId],
        }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to update flag.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to delete task.");
      }
    },
    onSuccess: async () => {
      toast.success("Task deleted.");
      setSelectedTaskId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-content"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete task.",
      );
    },
  });

  return (
    <div className="space-y-8">
      <PageIntro
        description="Moderate tasks across all users, inspect flagged entries, and review task content without leaving the admin area."
        eyebrow="Content moderation"
        title="System-wide task review and moderation controls."
      />

      <Card className="border-white/70 bg-white/80 shadow-soft">
        <CardContent className="grid gap-3 p-5 lg:grid-cols-[1.2fr_repeat(7,minmax(0,1fr))]">
          <Input
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search tasks or users..."
            value={searchInput}
          />
          <select
            className="h-11 rounded-2xl border border-input bg-background/80 px-4 text-sm"
            onChange={(event) =>
              setParams((params) => {
                if (event.target.value)
                  params.set("userId", event.target.value);
                else params.delete("userId");
                params.set("page", "1");
              })
            }
            value={queryState.userId}
          >
            <option value="">All users</option>
            {(usersQuery.data ?? []).map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <select
            className="h-11 rounded-2xl border border-input bg-background/80 px-4 text-sm"
            onChange={(event) =>
              setParams((params) => {
                if (event.target.value)
                  params.set("status", event.target.value);
                else params.delete("status");
                params.set("page", "1");
              })
            }
            value={queryState.status}
          >
            <option value="">All statuses</option>
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="DONE">DONE</option>
            <option value="BLOCKED">BLOCKED</option>
          </select>
          <select
            className="h-11 rounded-2xl border border-input bg-background/80 px-4 text-sm"
            onChange={(event) =>
              setParams((params) => {
                params.set("flagged", event.target.value);
                params.set("page", "1");
              })
            }
            value={queryState.flagged}
          >
            <option value="all">All flag states</option>
            <option value="true">Flagged</option>
            <option value="false">Unflagged</option>
          </select>
          <Input
            onChange={(event) =>
              setParams((params) => {
                if (event.target.value)
                  params.set("startDate", event.target.value);
                else params.delete("startDate");
                params.set("page", "1");
              })
            }
            type="date"
            value={queryState.startDate}
          />
          <Input
            onChange={(event) =>
              setParams((params) => {
                if (event.target.value)
                  params.set("endDate", event.target.value);
                else params.delete("endDate");
                params.set("page", "1");
              })
            }
            type="date"
            value={queryState.endDate}
          />
          <select
            className="h-11 rounded-2xl border border-input bg-background/80 px-4 text-sm"
            onChange={(event) =>
              setParams((params) => {
                params.set("sortBy", event.target.value);
                params.set("page", "1");
              })
            }
            value={queryState.sortBy}
          >
            <option value="date">Date</option>
            <option value="created_at">Created</option>
            <option value="ticket_number">Ticket #</option>
            <option value="ticket_title">Title</option>
            <option value="story_point">Story points</option>
            <option value="user_name">User</option>
          </select>
          <select
            className="h-11 rounded-2xl border border-input bg-background/80 px-4 text-sm"
            onChange={(event) =>
              setParams((params) => {
                params.set("sortOrder", event.target.value);
                params.set("page", "1");
              })
            }
            value={queryState.sortOrder}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/80 shadow-soft">
        <CardContent className="p-0">
          {contentQuery.isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton className="h-16 w-full" key={index} />
              ))}
            </div>
          ) : contentQuery.isError ? (
            <div className="p-6 text-sm text-destructive">
              {contentQuery.error instanceof Error
                ? contentQuery.error.message
                : "Unable to load tasks."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="bg-secondary/45 text-left text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Ticket #</th>
                    <th className="px-6 py-4 font-medium">Title</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">SP</th>
                    <th className="px-6 py-4 font-medium">Flagged</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(contentQuery.data?.data ?? []).map((task) => (
                    <tr className="border-t border-border/60" key={task.id}>
                      <td className="px-6 py-4">{task.date.slice(0, 10)}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{task.user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {task.user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">{task.ticketNumber}</td>
                      <td className="px-6 py-4">{task.ticketTitle}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{task.status}</Badge>
                      </td>
                      <td className="px-6 py-4">{task.storyPoint ?? "-"}</td>
                      <td className="px-6 py-4">
                        <Badge variant={task.flagged ? "default" : "outline"}>
                          {task.flagged ? "Flagged" : "Clean"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => setSelectedTaskId(task.id)}
                            size="sm"
                            variant="outline"
                          >
                            View
                          </Button>
                          <Button
                            onClick={() =>
                              flagMutation.mutate({
                                taskId: task.id,
                                flagged: !task.flagged,
                              })
                            }
                            size="sm"
                            variant="outline"
                          >
                            <Flag className="mr-2 h-4 w-4" />
                            {task.flagged ? "Unflag" : "Flag"}
                          </Button>
                          <Button
                            className="border-destructive/20 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMutation.mutate(task.id)}
                            size="sm"
                            variant="outline"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTaskId ? (
        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Task preview</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Read-only moderation view.
              </p>
            </div>
            <Button onClick={() => setSelectedTaskId(null)} variant="ghost">
              Close
            </Button>
          </CardHeader>
          <CardContent>
            {detailQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : detailQuery.data ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{detailQuery.data.ticketNumber}</Badge>
                  <Badge variant="outline">{detailQuery.data.status}</Badge>
                  <Badge
                    variant={detailQuery.data.flagged ? "default" : "outline"}
                  >
                    {detailQuery.data.flagged ? "Flagged" : "Clean"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold">
                    {detailQuery.data.ticketTitle}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {detailQuery.data.user.name} · {detailQuery.data.user.email}{" "}
                    · {formatDisplayDateTime(detailQuery.data.createdAt)}
                  </p>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-3 rounded-2xl border border-border/70 bg-background/70 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Description
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {detailQuery.data.ticketDescription}
                    </p>
                  </div>
                  <div className="space-y-3 rounded-2xl border border-border/70 bg-background/70 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Daily report
                    </p>
                    <TaskRichContent value={detailQuery.data.dailyReport} />
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
