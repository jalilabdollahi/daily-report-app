"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageIntro } from "@/components/shared/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDisplayDateTime } from "@/lib/utils";
import type { AppConfigShape } from "@/lib/app-config";

type ConfigResponse = {
  data: {
    values: AppConfigShape;
    lastUpdatedAt: string | null;
    lastUpdatedBy: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
};

async function fetchConfig() {
  const response = await fetch("/api/admin/config", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load configuration.");
  }

  return (await response.json()) as ConfigResponse;
}

export function AdminConfigScreen() {
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState<AppConfigShape | null>(null);
  const [allowedStatusesText, setAllowedStatusesText] = useState("");
  const [allowedTagsText, setAllowedTagsText] = useState("");

  const configQuery = useQuery({
    queryKey: ["admin-config"],
    queryFn: fetchConfig,
  });

  useEffect(() => {
    if (!configQuery.data) {
      return;
    }

    setFormValues(configQuery.data.data.values);
    setAllowedStatusesText(
      configQuery.data.data.values.allowed_statuses.join(", "),
    );
    setAllowedTagsText(configQuery.data.data.values.allowed_tags.join(", "));
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formValues) {
        return;
      }

      const response = await fetch("/api/admin/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formValues,
          allowed_statuses: allowedStatusesText
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          allowed_tags: allowedTagsText
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to save configuration.");
      }
    },
    onSuccess: async () => {
      toast.success("Configuration saved.");
      await queryClient.invalidateQueries({ queryKey: ["admin-config"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save configuration.",
      );
    },
  });

  if (configQuery.isLoading || !formValues) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-[520px] w-full" />
      </div>
    );
  }

  if (configQuery.isError) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6 text-sm text-destructive">
          {configQuery.error instanceof Error
            ? configQuery.error.message
            : "Unable to load configuration."}
        </CardContent>
      </Card>
    );
  }

  const configMeta = configQuery.data?.data;

  if (!configMeta) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageIntro
          description="Control operational defaults, feature toggles, and task conventions from a single settings surface."
          eyebrow="App configuration"
          title="Platform-level defaults and operational switches."
        />
        <div className="text-sm text-muted-foreground">
          {configMeta.lastUpdatedAt
            ? `Last updated ${formatDisplayDateTime(configMeta.lastUpdatedAt)} by ${
                configMeta.lastUpdatedBy?.name ?? "unknown"
              }`
            : "Using default configuration values"}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
              <Checkbox
                checked={formValues.registration_enabled}
                onCheckedChange={(checked) =>
                  setFormValues((current) =>
                    current
                      ? { ...current, registration_enabled: Boolean(checked) }
                      : current,
                  )
                }
              />
              <span>Registration enabled</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
              <Checkbox
                checked={formValues.maintenance_mode}
                onCheckedChange={(checked) =>
                  setFormValues((current) =>
                    current
                      ? { ...current, maintenance_mode: Boolean(checked) }
                      : current,
                  )
                }
              />
              <span>Maintenance mode</span>
            </label>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">File uploads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
              <Checkbox
                checked={formValues.file_uploads_enabled}
                onCheckedChange={(checked) =>
                  setFormValues((current) =>
                    current
                      ? { ...current, file_uploads_enabled: Boolean(checked) }
                      : current,
                  )
                }
              />
              <span>Enable file uploads</span>
            </label>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="max-file-size">
                Max file size (MB)
              </label>
              <Input
                id="max-file-size"
                onChange={(event) =>
                  setFormValues((current) =>
                    current
                      ? {
                          ...current,
                          max_file_size_mb: Number(event.target.value) || 1,
                        }
                      : current,
                  )
                }
                type="number"
                value={formValues.max_file_size_mb}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="allowed-statuses">
                Allowed statuses
              </label>
              <Input
                id="allowed-statuses"
                onChange={(event) => setAllowedStatusesText(event.target.value)}
                placeholder="TODO, IN_PROGRESS, DONE"
                value={allowedStatusesText}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="allowed-tags">
                Predefined tags
              </label>
              <Input
                id="allowed-tags"
                onChange={(event) => setAllowedTagsText(event.target.value)}
                placeholder="Bug, Feature, Urgent"
                value={allowedTagsText}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">Defaults & Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="default-theme">
                Default theme
              </label>
              <select
                className="flex h-11 w-full rounded-2xl border border-input bg-background/80 px-4 text-sm"
                id="default-theme"
                onChange={(event) =>
                  setFormValues((current) =>
                    current
                      ? {
                          ...current,
                          default_theme: event.target.value,
                        }
                      : current,
                  )
                }
                value={formValues.default_theme}
              >
                <option value="SYSTEM">System</option>
                <option value="LIGHT">Light</option>
                <option value="DARK">Dark</option>
              </select>
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="default-reminder-time"
              >
                Default reminder time
              </label>
              <Input
                id="default-reminder-time"
                onChange={(event) =>
                  setFormValues((current) =>
                    current
                      ? {
                          ...current,
                          default_reminder_time: event.target.value,
                        }
                      : current,
                  )
                }
                type="time"
                value={formValues.default_reminder_time}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="rate-limit-login">
                Max login attempts per minute
              </label>
              <Input
                id="rate-limit-login"
                onChange={(event) =>
                  setFormValues((current) =>
                    current
                      ? {
                          ...current,
                          rate_limit_login: Number(event.target.value) || 1,
                        }
                      : current,
                  )
                }
                type="number"
                value={formValues.rate_limit_login}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Button
        disabled={saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
        type="button"
      >
        Save configuration
      </Button>
    </div>
  );
}
