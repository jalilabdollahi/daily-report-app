"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  ListChecks,
  UserRound,
} from "lucide-react";

import { PageIntro } from "@/components/shared/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDisplayDateTime } from "@/lib/utils";
import type {
  AdminActivityItem,
  AdminActivitySummary,
  AdminUserListItem,
} from "@/types/admin";

type ResponseShape = {
  data: AdminActivityItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: AdminActivitySummary;
};

async function fetchActivity(query: string, signal?: AbortSignal) {
  const response = await fetch(`/api/admin/activity?${query}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Unable to load activity.");
  }

  return (await response.json()) as ResponseShape;
}

async function fetchUsers(signal?: AbortSignal) {
  const response = await fetch(
    "/api/admin/users?limit=100&page=1&sortBy=name&sortOrder=asc",
    {
      cache: "no-store",
      signal,
    },
  );

  if (!response.ok) {
    throw new Error("Unable to load users.");
  }

  const payload = (await response.json()) as { data: AdminUserListItem[] };
  return payload.data;
}

function buildQuery(searchParams: URLSearchParams) {
  const params = new URLSearchParams();
  [
    "search",
    "page",
    "limit",
    "sortOrder",
    "action",
    "userId",
    "startDate",
    "endDate",
  ].forEach((key) => {
    const value = searchParams.get(key);
    if (value) {
      params.set(key, value);
    }
  });

  if (!params.get("page")) params.set("page", "1");
  if (!params.get("limit")) params.set("limit", "20");
  if (!params.get("sortOrder")) params.set("sortOrder", "desc");

  return params.toString();
}

function formatActionLabel(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getActionBadgeClassName(action: string) {
  if (action.includes("FAILED")) {
    return "border-destructive/20 bg-destructive/10 text-destructive";
  }

  if (action.includes("DELETE")) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700";
  }

  if (action.includes("LOGIN") || action.includes("LOGOUT")) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-700";
  }

  return "border-primary/20 bg-primary/10 text-primary";
}

export function AdminActivityScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const queryState = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return {
      search: params.get("search") ?? "",
      action: params.get("action") ?? "",
      userId: params.get("userId") ?? "",
      startDate: params.get("startDate") ?? "",
      endDate: params.get("endDate") ?? "",
      page: Number(params.get("page") ?? "1"),
      limit: Number(params.get("limit") ?? "20"),
      sortOrder: params.get("sortOrder") ?? "desc",
    };
  }, [searchParamsString]);

  const [searchInput, setSearchInput] = useState(queryState.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchInput(queryState.search);
  }, [queryState.search]);

  const setParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParamsString);
      updater(params);
      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParamsString],
  );

  useEffect(() => {
    if (debouncedSearch === queryState.search) return;

    setParams((params) => {
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      } else {
        params.delete("search");
      }
      params.set("page", "1");
    });
  }, [debouncedSearch, queryState.search, setParams]);

  const queryString = useMemo(
    () => buildQuery(new URLSearchParams(searchParamsString)),
    [searchParamsString],
  );
  const activityQuery = useQuery({
    queryKey: ["admin-activity", queryString],
    queryFn: ({ signal }) => fetchActivity(queryString, signal),
  });
  const usersQuery = useQuery({
    queryKey: ["admin-activity-users"],
    queryFn: ({ signal }) => fetchUsers(signal),
    staleTime: 60_000,
  });
  const rows = activityQuery.data?.data ?? [];
  const summary = activityQuery.data?.summary ?? {
    total: 0,
    uniqueActors: 0,
    taskEvents: 0,
    authEvents: 0,
    failedLogins: 0,
    topActions: [],
  };
  const summaryCards = [
    {
      label: "Events in view",
      value: summary.total,
      helper: "Matches the current filters",
      icon: ListChecks,
    },
    {
      label: "Unique actors",
      value: summary.uniqueActors,
      helper: "Distinct users behind the events",
      icon: UserRound,
    },
    {
      label: "Task activity",
      value: summary.taskEvents,
      helper: "Creates, edits, deletes, and moderation",
      icon: ListChecks,
    },
    {
      label: "Failed logins",
      value: summary.failedLogins,
      helper: "Failed sign-in attempts in the current view",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageIntro
          description="Inspect the audit trail for authentication, task changes, moderation, and administration."
          eyebrow="Activity logs"
          title="Searchable audit history across the platform."
        />
        <Button
          onClick={() =>
            window.location.assign(`/api/admin/activity/export?${queryString}`)
          }
          type="button"
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card
              className="border-white/70 bg-white/80 shadow-soft"
              key={card.label}
            >
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="text-3xl font-semibold">{card.value}</p>
                  <p className="text-sm text-muted-foreground">
                    {card.helper}
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="border-white/70 bg-white/80 shadow-soft">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/10 text-primary">
              {summary.authEvents} auth events
            </Badge>
            {summary.topActions.map((item) => (
              <Badge key={item.action} variant="outline">
                {formatActionLabel(item.action)}: {item.count}
              </Badge>
            ))}
            {queryState.search ||
            queryState.action ||
            queryState.userId ||
            queryState.startDate ||
            queryState.endDate ? (
              <Button
                onClick={() => router.replace(pathname, { scroll: false })}
                type="button"
                variant="ghost"
              >
                Clear filters
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(5,minmax(0,1fr))]">
            <Input
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by action or user..."
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
            <Input
              onChange={(event) =>
                setParams((params) => {
                  if (event.target.value)
                    params.set("action", event.target.value);
                  else params.delete("action");
                  params.set("page", "1");
                })
              }
              placeholder="Action type..."
              value={queryState.action}
            />
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
                  params.set("sortOrder", event.target.value);
                  params.set("page", "1");
                })
              }
              value={queryState.sortOrder}
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/80 shadow-soft">
        <CardContent className="p-0">
          {activityQuery.isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton className="h-16 w-full" key={index} />
              ))}
            </div>
          ) : activityQuery.isError ? (
            <div className="p-6 text-sm text-destructive">
              {activityQuery.error instanceof Error
                ? activityQuery.error.message
                : "Unable to load activity."}
            </div>
          ) : rows.length === 0 ? (
            <div className="space-y-2 p-6">
              <p className="text-base font-medium">No activity matches this view.</p>
              <p className="text-sm text-muted-foreground">
                Try clearing the filters or widening the date range to inspect
                more events.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="bg-secondary/45 text-left text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-medium">Timestamp</th>
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                    <th className="px-6 py-4 font-medium">Target</th>
                    <th className="px-6 py-4 font-medium">IP Address</th>
                    <th className="px-6 py-4 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isExpanded = expandedRows.includes(row.id);

                    return (
                      <Fragment key={row.id}>
                        <tr className="border-t border-border/60" key={row.id}>
                          <td className="px-6 py-4">
                            {formatDisplayDateTime(row.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            {row.user ? (
                              <div>
                                <p className="font-medium">{row.user.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {row.user.email}
                                </p>
                              </div>
                            ) : (
                              "System"
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              className={getActionBadgeClassName(row.action)}
                              variant="outline"
                            >
                              {formatActionLabel(row.action)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {[row.targetType, row.targetId]
                              .filter(Boolean)
                              .join(": ") || "System"}
                          </td>
                          <td className="px-6 py-4">{row.ipAddress ?? "-"}</td>
                          <td className="px-6 py-4">
                            <Button
                              onClick={() =>
                                setExpandedRows((current) =>
                                  isExpanded
                                    ? current.filter((item) => item !== row.id)
                                    : [...current, row.id],
                                )
                              }
                              size="sm"
                              variant="ghost"
                            >
                              {isExpanded ? (
                                <ChevronUp className="mr-2 h-4 w-4" />
                              ) : (
                                <ChevronDown className="mr-2 h-4 w-4" />
                              )}
                              {isExpanded ? "Hide" : "Show"}
                            </Button>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="border-t border-border/40 bg-secondary/30">
                            <td className="px-6 py-4" colSpan={6}>
                              <pre className="overflow-x-auto rounded-2xl bg-background/80 p-4 text-xs">
                                {JSON.stringify(row.metadata ?? {}, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          disabled={(activityQuery.data?.page ?? 1) <= 1}
          onClick={() =>
            setParams((params) => {
              params.set("page", String(Math.max(1, queryState.page - 1)));
            })
          }
          variant="outline"
        >
          Previous
        </Button>
        <p className="text-sm text-muted-foreground">
          Page {activityQuery.data?.page ?? 1} of{" "}
          {activityQuery.data?.totalPages ?? 1}
        </p>
        <Button
          disabled={
            (activityQuery.data?.page ?? 1) >=
            (activityQuery.data?.totalPages ?? 1)
          }
          onClick={() =>
            setParams((params) => {
              params.set("page", String(queryState.page + 1));
            })
          }
          variant="outline"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
