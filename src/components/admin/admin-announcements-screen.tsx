"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageIntro } from "@/components/shared/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDisplayDateTime, truncateText } from "@/lib/utils";
import type { AdminAnnouncement } from "@/types/admin";

type AnnouncementsResponse = {
  data: AdminAnnouncement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

async function fetchAnnouncements(query: string, signal?: AbortSignal) {
  const response = await fetch(`/api/admin/announcements?${query}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Unable to load announcements.");
  }

  return (await response.json()) as AnnouncementsResponse;
}

function buildQuery(searchParams: URLSearchParams) {
  const params = new URLSearchParams();
  ["search", "page", "limit", "sortOrder", "status"].forEach((key) => {
    const value = searchParams.get(key);
    if (value) params.set(key, value);
  });

  if (!params.get("page")) params.set("page", "1");
  if (!params.get("limit")) params.set("limit", "10");
  if (!params.get("sortOrder")) params.set("sortOrder", "desc");
  if (!params.get("status")) params.set("status", "all");

  return params.toString();
}

export function AdminAnnouncementsScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const queryState = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return {
      search: params.get("search") ?? "",
      status: params.get("status") ?? "all",
      page: Number(params.get("page") ?? "1"),
    };
  }, [searchParamsString]);

  const [searchInput, setSearchInput] = useState(queryState.search);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<AdminAnnouncement | null>(null);
  const [formValues, setFormValues] = useState({
    title: "",
    message: "",
    expiresAt: "",
  });
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

  useEffect(() => {
    if (!editingAnnouncement) {
      setFormValues({ title: "", message: "", expiresAt: "" });
      return;
    }

    setFormValues({
      title: editingAnnouncement.title,
      message: editingAnnouncement.message,
      expiresAt: editingAnnouncement.expiresAt
        ? editingAnnouncement.expiresAt.slice(0, 16)
        : "",
    });
  }, [editingAnnouncement]);

  const queryString = useMemo(
    () => buildQuery(new URLSearchParams(searchParamsString)),
    [searchParamsString],
  );
  const announcementsQuery = useQuery({
    queryKey: ["admin-announcements", queryString],
    queryFn: ({ signal }) => fetchAnnouncements(queryString, signal),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        editingAnnouncement
          ? `/api/admin/announcements/${editingAnnouncement.id}`
          : "/api/admin/announcements",
        {
          method: editingAnnouncement ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: formValues.title,
            message: formValues.message,
            expiresAt: formValues.expiresAt
              ? new Date(formValues.expiresAt).toISOString()
              : null,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to save announcement.");
      }
    },
    onSuccess: async () => {
      toast.success(
        editingAnnouncement ? "Announcement updated." : "Announcement created.",
      );
      setEditingAnnouncement(null);
      setFormValues({ title: "", message: "", expiresAt: "" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }),
        queryClient.invalidateQueries({ queryKey: ["active-announcements"] }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to save announcement.",
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      const response = await fetch(
        `/api/admin/announcements/${announcementId}/toggle`,
        {
          method: "PUT",
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to update announcement.");
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }),
        queryClient.invalidateQueries({ queryKey: ["active-announcements"] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      const response = await fetch(
        `/api/admin/announcements/${announcementId}`,
        {
          method: "DELETE",
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to delete announcement.");
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }),
        queryClient.invalidateQueries({ queryKey: ["active-announcements"] }),
      ]);
    },
  });

  return (
    <div className="space-y-8">
      <PageIntro
        description="Create, preview, activate, and retire global messages that appear across the user dashboard."
        eyebrow="Announcements"
        title="User-facing notice management for admins."
      />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">
              {editingAnnouncement
                ? "Edit announcement"
                : "Create announcement"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="announcement-title"
              >
                Title
              </label>
              <Input
                id="announcement-title"
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                value={formValues.title}
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="announcement-message"
              >
                Message
              </label>
              <Textarea
                id="announcement-message"
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                value={formValues.message}
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="announcement-expiry"
              >
                Expiry
              </label>
              <Input
                id="announcement-expiry"
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    expiresAt: event.target.value,
                  }))
                }
                type="datetime-local"
                value={formValues.expiresAt}
              />
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Preview
              </p>
              <p className="mt-2 font-medium">
                {formValues.title || "Announcement title"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {formValues.message || "Announcement preview message"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                type="button"
              >
                {editingAnnouncement ? "Save changes" : "Create announcement"}
              </Button>
              {editingAnnouncement ? (
                <Button
                  onClick={() => setEditingAnnouncement(null)}
                  type="button"
                  variant="ghost"
                >
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-white/70 bg-white/80 shadow-soft">
            <CardContent className="grid gap-3 p-5 sm:grid-cols-[1.1fr_0.9fr]">
              <Input
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search announcements..."
                value={searchInput}
              />
              <select
                className="h-11 rounded-2xl border border-input bg-background/80 px-4 text-sm"
                onChange={(event) =>
                  setParams((params) => {
                    params.set("status", event.target.value);
                    params.set("page", "1");
                  })
                }
                value={queryState.status}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </CardContent>
          </Card>

          {announcementsQuery.isLoading ? (
            <Card className="border-white/70 bg-white/80 shadow-soft">
              <CardContent className="space-y-4 p-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton className="h-28 w-full" key={index} />
                ))}
              </CardContent>
            </Card>
          ) : (
            (announcementsQuery.data?.data ?? []).map((announcement) => (
              <Card
                className="border-white/70 bg-white/80 shadow-soft"
                key={announcement.id}
              >
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={announcement.isActive ? "accent" : "outline"}
                        >
                          {announcement.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {announcement.expiresAt ? (
                          <Badge variant="outline">
                            Expires{" "}
                            {formatDisplayDateTime(announcement.expiresAt)}
                          </Badge>
                        ) : null}
                      </div>
                      <h3 className="text-xl font-semibold">
                        {announcement.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {truncateText(announcement.message, 180)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{announcement.admin.name}</p>
                      <p>{formatDisplayDateTime(announcement.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => setEditingAnnouncement(announcement)}
                      size="sm"
                      variant="outline"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => toggleMutation.mutate(announcement.id)}
                      size="sm"
                      variant="outline"
                    >
                      {announcement.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      className="border-destructive/20 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteMutation.mutate(announcement.id)}
                      size="sm"
                      variant="outline"
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <div className="flex items-center justify-between">
        <Button
          disabled={(announcementsQuery.data?.page ?? 1) <= 1}
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
          Page {announcementsQuery.data?.page ?? 1} of{" "}
          {announcementsQuery.data?.totalPages ?? 1}
        </p>
        <Button
          disabled={
            (announcementsQuery.data?.page ?? 1) >=
            (announcementsQuery.data?.totalPages ?? 1)
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
