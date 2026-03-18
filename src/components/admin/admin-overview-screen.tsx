"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Database,
  HardDrive,
  Megaphone,
  ScrollText,
  Shield,
  Users,
} from "lucide-react";

import { AdminTrendChart } from "@/components/admin/admin-trend-chart";
import { PageIntro } from "@/components/shared/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes, formatDisplayDateTime } from "@/lib/utils";
import type { AdminStats } from "@/types/admin";

async function fetchAdminStats() {
  const response = await fetch("/api/admin/stats", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load admin statistics.");
  }

  const payload = (await response.json()) as { data: AdminStats };
  return payload.data;
}

function formatActionLabel(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminOverviewScreen() {
  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
    staleTime: 30_000,
  });

  if (statsQuery.isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-40 w-full" key={index} />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (statsQuery.isError || !statsQuery.data) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6 text-sm text-destructive">
          {statsQuery.error instanceof Error
            ? statsQuery.error.message
            : "Unable to load admin dashboard."}
        </CardContent>
      </Card>
    );
  }

  const stats = statsQuery.data;
  const statCards = [
    {
      label: "Total users",
      value: String(stats.users.total),
      helper: `${stats.users.members} normal users, ${stats.users.admins} admins`,
      icon: Users,
    },
    {
      label: "Needs attention",
      value: String(stats.users.inactive + stats.users.neverLoggedIn),
      helper: `${stats.users.neverLoggedIn} never logged in`,
      icon: AlertTriangle,
    },
    {
      label: "Task volume",
      value: String(stats.tasks.total),
      helper: `${stats.tasks.done} done, ${stats.tasks.blocked} blocked, ${stats.tasks.flagged} flagged`,
      icon: Database,
    },
    {
      label: "Activity today",
      value: String(stats.activity.today),
      helper: `${stats.activity.failedLogins7Days} failed logins in the last 7 days`,
      icon: Activity,
    },
    {
      label: "Announcements",
      value: String(stats.announcements.active),
      helper: "Currently visible to users",
      icon: Megaphone,
    },
    {
      label: "Storage used",
      value: formatBytes(stats.storageUsedBytes),
      helper: "Attachments and avatars combined",
      icon: HardDrive,
    },
  ];
  const quickLinks = [
    {
      title: "Users",
      description: "Browse all normal users, admins, and inactive accounts.",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "Activity logs",
      description: "Audit authentication, task edits, and admin actions.",
      href: "/admin/activity",
      icon: ScrollText,
    },
    {
      title: "Moderation",
      description: "Review flagged tasks and intervene when content needs attention.",
      href: "/admin/content",
      icon: Shield,
    },
    {
      title: "Announcements",
      description: "Publish notices that appear in the user workspace.",
      href: "/admin/announcements",
      icon: Megaphone,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 px-6 py-8 shadow-soft">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-primary/10 via-accent/10 to-transparent" />
        <div className="relative space-y-5">
          <PageIntro
            description="Monitor growth, moderation, operations, and the overall health of the reporting platform from one control surface."
            eyebrow="Admin overview"
            title="System-wide visibility for the whole Daily Report App."
          />
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-primary/10 text-primary">
              {stats.users.newThisWeek} new users this week
            </Badge>
            <Badge variant="outline">
              {stats.tasks.thisMonth} tasks created this month
            </Badge>
            <Badge variant="outline">
              {stats.activity.last7Days} events in the last 7 days
            </Badge>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              className="border-white/70 bg-white/80 shadow-soft"
              key={card.label}
            >
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {card.label}
                  </p>
                </div>
                <CardTitle className="text-4xl font-semibold">
                  {card.value}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{card.helper}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {quickLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              className="border-white/70 bg-white/80 shadow-soft"
              key={item.href}
            >
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={item.href}>Open</Link>
                  </Button>
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">New registrations</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last 30 days of account creation activity.
            </p>
          </CardHeader>
          <CardContent>
            <AdminTrendChart
              color="#0f766e"
              data={stats.registrationsPerDay}
              type="line"
            />
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">Tasks created</CardTitle>
            <p className="text-sm text-muted-foreground">
              System-wide task volume over the last 30 days.
            </p>
          </CardHeader>
          <CardContent>
            <AdminTrendChart
              color="#f97316"
              data={stats.tasksPerDay}
              type="bar"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">Recent users</CardTitle>
            <p className="text-sm text-muted-foreground">
              The newest accounts created across the platform.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentUsers.map((user) => (
              <div
                className="rounded-2xl border border-border/70 bg-background/70 p-4"
                key={user.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
                      {user.role}
                    </Badge>
                    <Badge variant={user.isActive ? "accent" : "outline"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Joined {formatDisplayDateTime(user.createdAt)} · Last login{" "}
                  {user.lastLogin ? formatDisplayDateTime(user.lastLogin) : "Never"} ·{" "}
                  {user.taskCount} tasks
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-secondary/60 shadow-soft">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">Users needing attention</CardTitle>
            <p className="text-sm text-muted-foreground">
              Accounts worth reviewing next based on inactivity, onboarding, or missing task history.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.usersNeedingAttention.length ? (
              stats.usersNeedingAttention.map((user) => (
                <div
                  className="rounded-2xl border border-border/70 bg-background/70 p-4"
                  key={user.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant="outline">{user.reason}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Joined {formatDisplayDateTime(user.createdAt)} · Last login{" "}
                    {user.lastLogin ? formatDisplayDateTime(user.lastLogin) : "Never"}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                No user accounts currently stand out for follow-up.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">Top active users</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ranked by total task count across the workspace.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Tasks</th>
                  <th className="pb-3 font-medium">Story Points</th>
                </tr>
              </thead>
              <tbody>
                {stats.topUsers.length ? (
                  stats.topUsers.map((user) => (
                    <tr className="border-t border-border/60" key={user.id}>
                      <td className="py-3 font-medium">{user.name}</td>
                      <td className="py-3 text-muted-foreground">{user.email}</td>
                      <td className="py-3">{user.taskCount}</td>
                      <td className="py-3">{user.storyPoints}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-border/60">
                    <td className="py-4 text-muted-foreground" colSpan={4}>
                      No task activity has been recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-secondary/60 shadow-soft">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">Recent activity</CardTitle>
            <p className="text-sm text-muted-foreground">
              The latest 10 auditable events across the platform.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentActivity.length ? (
              stats.recentActivity.map((entry) => (
                <div
                  className="rounded-2xl border border-border/70 bg-background/70 p-4"
                  key={entry.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {entry.user?.name ?? "System"} · {formatActionLabel(entry.action)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {entry.user?.email ?? "No user attached"}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {entry.targetType ?? "system"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {formatDisplayDateTime(entry.createdAt)}
                    {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                No audit events have been recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
