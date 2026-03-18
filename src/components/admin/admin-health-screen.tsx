"use client";

import { useQuery } from "@tanstack/react-query";

import { PageIntro } from "@/components/shared/page-intro";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "@/lib/utils";
import type { AdminHealth } from "@/types/admin";

async function fetchHealth() {
  const response = await fetch("/api/admin/health", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load system health.");
  }

  const payload = (await response.json()) as { data: AdminHealth };
  return payload.data;
}

export function AdminHealthScreen() {
  const healthQuery = useQuery({
    queryKey: ["admin-health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  if (healthQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (healthQuery.isError || !healthQuery.data) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6 text-sm text-destructive">
          {healthQuery.error instanceof Error
            ? healthQuery.error.message
            : "Unable to load health checks."}
        </CardContent>
      </Card>
    );
  }

  const health = healthQuery.data;
  const statusBadgeVariant = (status: "healthy" | "degraded") =>
    status === "healthy" ? "accent" : "outline";

  return (
    <div className="space-y-8">
      <PageIntro
        description="Operational signals refresh automatically every 30 seconds so you can monitor infrastructure health without leaving the admin area."
        eyebrow="System health"
        title="Database, API, storage, and runtime health at a glance."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">Database</CardTitle>
            <Badge variant={statusBadgeVariant(health.database.status)}>
              {health.database.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{health.database.responseTimeMs} ms response time</p>
            <p>
              {health.database.sizeBytes !== null
                ? formatBytes(health.database.sizeBytes)
                : "Size unavailable"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">API</CardTitle>
            <Badge variant={statusBadgeVariant(health.api.status)}>
              {health.api.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{health.api.avgResponseTimeMs} ms average response</p>
            <p>{health.activeSessions} active sessions</p>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">Storage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{formatBytes(health.storageUsedBytes)} in use</p>
            <p>Uploads and avatars combined</p>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">Uptime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{Math.round(health.uptimeSeconds / 60)} minutes</p>
            <p>{health.environment}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">Environment info</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Node.js
              </p>
              <p className="mt-2 font-medium">{health.nodeVersion}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Next.js
              </p>
              <p className="mt-2 font-medium">{health.nextVersion}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Environment
              </p>
              <p className="mt-2 font-medium">{health.environment}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Last deployment
              </p>
              <p className="mt-2 font-medium">
                {health.lastDeploymentAt ?? "Unavailable"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-secondary/60 shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">Recent errors</CardTitle>
          </CardHeader>
          <CardContent>
            {health.recentErrors.length ? (
              <div className="space-y-3">
                {health.recentErrors.map((error) => (
                  <div
                    className="rounded-2xl border border-border/70 bg-background/70 p-4"
                    key={error.id}
                  >
                    <p className="font-medium">{error.message}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {error.createdAt}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent errors.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
