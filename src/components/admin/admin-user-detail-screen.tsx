"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageIntro } from "@/components/shared/page-intro";
import { UserAvatar } from "@/components/shared/user-avatar";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDisplayDateTime } from "@/lib/utils";
import type { AdminUserDetail } from "@/types/admin";

async function fetchUserDetail(userId: string) {
  const response = await fetch(`/api/admin/users/${userId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Unable to load user.");
  }

  const payload = (await response.json()) as { data: AdminUserDetail };
  return payload.data;
}

export function AdminUserDetailScreen({ userId }: { userId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    role: "USER",
  });
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );

  const userQuery = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => fetchUserDetail(userId),
  });

  useEffect(() => {
    if (!userQuery.data) {
      return;
    }

    setFormValues({
      name: userQuery.data.name,
      email: userQuery.data.email,
      role: userQuery.data.role,
    });
  }, [userQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formValues),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to update user.");
      }
    },
    onSuccess: async () => {
      toast.success("User updated.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-user", userId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to update user.",
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to update status.");
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-user", userId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to update status.",
      );
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/admin/users/${userId}/reset-password`,
        {
          method: "POST",
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        data?: { temporaryPassword: string };
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to reset password.");
      }

      return payload?.data?.temporaryPassword ?? "";
    },
    onSuccess: (password) => {
      setTemporaryPassword(password);
      toast.success("Temporary password generated.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to reset password.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to delete user.");
      }
    },
    onSuccess: async () => {
      toast.success("User deleted.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      router.push("/admin/users");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete user.",
      );
    },
  });

  if (userQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (userQuery.isError || !userQuery.data) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6 text-sm text-destructive">
          {userQuery.error instanceof Error
            ? userQuery.error.message
            : "Unable to load user."}
        </CardContent>
      </Card>
    );
  }

  const user = userQuery.data;

  return (
    <>
      <div className="space-y-8">
        <PageIntro
          description="Review account details, recent behavior, and administrative actions for this user."
          eyebrow="User detail"
          title={user.name}
        />

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-white/70 bg-white/80 shadow-soft">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center gap-4">
                <UserAvatar
                  avatarUrl={user.avatarUrl}
                  name={user.name}
                  size="lg"
                />
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{user.role}</Badge>
                    <Badge variant={user.isActive ? "accent" : "outline"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {formatDisplayDateTime(user.createdAt)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Tasks
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {user.taskCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Story points
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {user.totalStoryPoints}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Last login
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {user.lastLogin
                      ? formatDisplayDateTime(user.lastLogin)
                      : "Never"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="admin-user-name"
                  >
                    Name
                  </label>
                  <Input
                    id="admin-user-name"
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    value={formValues.name}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="admin-user-email"
                  >
                    Email
                  </label>
                  <Input
                    id="admin-user-email"
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    value={formValues.email}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="admin-user-role"
                  >
                    Role
                  </label>
                  <select
                    className="flex h-11 w-full rounded-2xl border border-input bg-background/80 px-4 text-sm"
                    id="admin-user-role"
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        role: event.target.value,
                      }))
                    }
                    value={formValues.role}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              {temporaryPassword ? (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
                  <p className="font-medium text-primary">Temporary password</p>
                  <p className="mt-2 break-all font-mono">
                    {temporaryPassword}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                  type="button"
                >
                  Save changes
                </Button>
                <Button
                  onClick={() => statusMutation.mutate(!user.isActive)}
                  type="button"
                  variant="outline"
                >
                  {user.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  onClick={() => resetPasswordMutation.mutate()}
                  type="button"
                  variant="outline"
                >
                  Reset password
                </Button>
                <Button
                  className="border-destructive/20 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => setDeleteDialogOpen(true)}
                  type="button"
                  variant="outline"
                >
                  Delete user
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/70 bg-white/80 shadow-soft">
              <CardHeader>
                <CardTitle className="text-2xl">Recent tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.recentTasks.length ? (
                  user.recentTasks.map((task) => (
                    <div
                      className="rounded-2xl border border-border/70 bg-background/70 p-4"
                      key={task.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{task.ticketNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {task.ticketTitle}
                          </p>
                        </div>
                        <Badge variant="outline">{task.status}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No recent tasks.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/70 bg-secondary/60 shadow-soft">
              <CardHeader>
                <CardTitle className="text-2xl">Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.recentActivity.length ? (
                  user.recentActivity.map((entry) => (
                    <div
                      className="rounded-2xl border border-border/70 bg-background/70 p-4"
                      key={entry.id}
                    >
                      <p className="font-medium">{entry.action}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDisplayDateTime(entry.createdAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No activity recorded.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the account and all related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                deleteMutation.mutate();
              }}
            >
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
