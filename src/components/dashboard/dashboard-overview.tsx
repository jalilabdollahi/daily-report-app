"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ClipboardList,
  Copy,
  Flame,
  Loader2,
  Plus,
  TimerReset,
} from "lucide-react";
import { toast } from "sonner";

import { AnnouncementBanner } from "@/components/dashboard/announcement-banner";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildDashboardReminderCopy, formatReminderTime } from "@/lib/reminders";
import { formatDisplayDate } from "@/lib/utils";
import type { ActiveAnnouncement, DashboardStats } from "@/types/dashboard";
import type { UserProfile } from "@/types/user";

type DuplicatePreview = {
  date: string;
  count: number;
} | null;

async function fetchDashboardStats() {
  const response = await fetch("/api/dashboard/stats", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load dashboard stats.");
  }

  const payload = (await response.json()) as { data: DashboardStats };
  return payload.data;
}

async function fetchAnnouncements() {
  const response = await fetch("/api/announcements/active", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load announcements.");
  }

  const payload = (await response.json()) as { data: ActiveAnnouncement[] };
  return payload.data;
}

async function fetchDuplicatePreview() {
  const response = await fetch("/api/tasks/duplicate-previous", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to check previous task day.");
  }

  const payload = (await response.json()) as { data: DuplicatePreview };
  return payload.data;
}

async function fetchUserProfile() {
  const response = await fetch("/api/user/profile", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load user settings.");
  }

  const payload = (await response.json()) as { data: UserProfile };
  return payload.data;
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

function getGreeting(name: string) {
  const hour = new Date().getHours();

  if (hour < 12) {
    return `Good morning, ${name}`;
  }

  if (hour < 18) {
    return `Good afternoon, ${name}`;
  }

  return `Good evening, ${name}`;
}

export function DashboardOverview({ userName }: { userName: string }) {
  const queryClient = useQueryClient();
  const statsQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    staleTime: 30_000,
  });
  const announcementsQuery = useQuery({
    queryKey: ["active-announcements"],
    queryFn: fetchAnnouncements,
    staleTime: 30_000,
  });
  const duplicatePreviewQuery = useQuery({
    queryKey: ["duplicate-previous-preview"],
    queryFn: fetchDuplicatePreview,
    staleTime: 30_000,
  });
  const profileQuery = useQuery({
    queryKey: ["user-profile", "dashboard"],
    queryFn: fetchUserProfile,
    staleTime: 60_000,
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
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
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

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
      }).format(new Date()),
    [],
  );

  if (statsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-40 w-full" key={index} />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (statsQuery.isError || !statsQuery.data) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6 text-sm text-destructive">
          {statsQuery.error instanceof Error
            ? statsQuery.error.message
            : "Unable to load dashboard."}
        </CardContent>
      </Card>
    );
  }

  const stats = statsQuery.data;
  const reminderCopy = buildDashboardReminderCopy({
    reminderEnabled: profileQuery.data?.reminderEnabled ?? false,
    reminderTime: profileQuery.data?.reminderTime ?? "17:00",
  });
  const dashboardCards = [
    {
      label: "Total tasks",
      value: stats.totalTasks,
      helper: "All time",
      icon: ClipboardList,
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      label: "Today",
      value: stats.todayTasks,
      helper: "Logged today",
      icon: TimerReset,
      color: "bg-emerald-500/10 text-emerald-600",
    },
    {
      label: "Week SP",
      value: stats.thisWeekStoryPoints,
      helper: "Story points this week",
      icon: Flame,
      color: "bg-orange-500/10 text-orange-600",
    },
    {
      label: "Done",
      value: stats.tasksByStatus.DONE,
      helper: "Completed tasks",
      icon: CheckCircle2,
      color: "bg-primary/10 text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      <AnnouncementBanner announcements={announcementsQuery.data ?? []} />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-secondary/30 px-6 py-7 shadow-soft">
        <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/8 to-transparent" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
              {todayLabel}
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {getGreeting(userName)} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              Here&apos;s your reporting overview for today.
            </p>
          </div>
          <Button asChild size="sm" className="w-fit gap-1.5 shrink-0">
            <Link href="/dashboard/tasks/new">
              <Plus className="h-3.5 w-3.5" />
              New task
            </Link>
          </Button>
        </div>
      </section>

      {/* Nudge banner */}
      {stats.todayTasks === 0 ? (
        <div
          className={`flex flex-col gap-4 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
            reminderCopy.overdue
              ? "border-accent/40 bg-accent/10"
              : "border-border/60 bg-secondary/40"
          }`}
        >
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">{reminderCopy.title}</p>
            <p className="text-xs text-muted-foreground">
              {reminderCopy.description}{" "}
              {duplicatePreviewQuery.data
                ? `Or duplicate ${duplicatePreviewQuery.data.count} task${duplicatePreviewQuery.data.count === 1 ? "" : "s"} from ${new Date(duplicatePreviewQuery.data.date).toLocaleDateString("en-US", { dateStyle: "medium" })}.`
                : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/dashboard/tasks/new">Add task</Link>
            </Button>
            {duplicatePreviewQuery.data ? (
              <Button
                disabled={duplicateMutation.isPending}
                onClick={() => duplicateMutation.mutate()}
                size="sm"
                type="button"
                variant="outline"
              >
                {duplicateMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                )}
                Duplicate previous
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Stat cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft"
            >
              <div className="flex items-start justify-between">
                <div className={`rounded-xl p-2.5 ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {card.helper}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold tracking-tight">{card.value}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{card.label}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Chart + Status */}
      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="mb-5 space-y-0.5">
            <h2 className="font-semibold">Activity — last 7 days</h2>
            <p className="text-xs text-muted-foreground">Tasks logged per day</p>
          </div>
          <ActivityChart points={stats.tasksPerDay} />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="mb-5 space-y-0.5">
            <h2 className="font-semibold">Status breakdown</h2>
            <p className="text-xs text-muted-foreground">All tasks by current status</p>
          </div>
          <div className="space-y-2.5">
            {Object.entries(stats.tasksByStatus).map(([status, count]) => (
              <div
                className="flex items-center justify-between rounded-xl border border-border/50 bg-background/60 px-3.5 py-2.5"
                key={status}
              >
                <TaskStatusBadge
                  status={status as keyof DashboardStats["tasksByStatus"]}
                />
                <span className="text-sm font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent + Period */}
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border/60 bg-card shadow-soft">
          <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
            <div>
              <h2 className="font-semibold">Recent tasks</h2>
              <p className="text-xs text-muted-foreground">Last 5 entries</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/tasks">View all →</Link>
            </Button>
          </div>
          <div className="divide-y divide-border/40">
            {stats.recentTasks.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No tasks yet. Add your first one!
              </p>
            ) : (
              stats.recentTasks.map((task) => (
                <Link
                  className="flex items-center justify-between gap-4 px-6 py-3.5 transition hover:bg-secondary/30"
                  href={`/dashboard/tasks/${task.id}`}
                  key={task.id}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary">{task.ticketNumber}</span>
                      <span className="text-xs text-muted-foreground">{formatDisplayDate(task.date)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-medium">{task.ticketTitle}</p>
                  </div>
                  <TaskStatusBadge status={task.status} />
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="mb-4 space-y-0.5">
            <h2 className="font-semibold">This period</h2>
            <p className="text-xs text-muted-foreground">Week &amp; month summary</p>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 bg-background/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">This week</p>
              <p className="mt-2 text-3xl font-bold">{stats.thisWeekTasks}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                tasks · <span className="font-medium text-foreground">{stats.thisWeekStoryPoints}</span> story points
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">This month</p>
              <p className="mt-2 text-3xl font-bold">{stats.thisMonthTasks}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                tasks · <span className="font-medium text-foreground">{stats.thisMonthStoryPoints}</span> story points
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
