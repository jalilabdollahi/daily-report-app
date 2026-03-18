"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Eye,
  KeyRound,
  Shield,
  Trash2,
  UserCheck,
  UserRound,
  UserX,
} from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDisplayDateTime } from "@/lib/utils";
import type { AdminUserListItem, AdminUsersSummary } from "@/types/admin";

type AdminUsersResponse = {
  data: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: AdminUsersSummary;
};

async function fetchUsers(query: string, signal?: AbortSignal) {
  const response = await fetch(`/api/admin/users?${query}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Unable to load users.");
  }

  return (await response.json()) as AdminUsersResponse;
}

async function toggleUserStatus(userId: string, isActive: boolean) {
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
    throw new Error(payload?.error ?? "Unable to update user status.");
  }
}

async function resetPassword(userId: string) {
  const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as {
    data?: { temporaryPassword: string };
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Unable to reset password.");
  }

  return payload?.data?.temporaryPassword ?? "";
}

async function deleteUser(userId: string) {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: "DELETE",
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Unable to delete user.");
  }
}

function buildQueryFromParams(searchParams: URLSearchParams) {
  const params = new URLSearchParams();
  const keys = [
    "search",
    "page",
    "limit",
    "sortBy",
    "sortOrder",
    "role",
    "is_active",
  ];

  keys.forEach((key) => {
    const value = searchParams.get(key);
    if (value) {
      params.set(key, value);
    }
  });

  if (!params.get("page")) {
    params.set("page", "1");
  }

  if (!params.get("limit")) {
    params.set("limit", "10");
  }

  if (!params.get("sortBy")) {
    params.set("sortBy", "created_at");
  }

  if (!params.get("sortOrder")) {
    params.set("sortOrder", "desc");
  }

  return params.toString();
}

export function AdminUsersScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [userToDelete, setUserToDelete] = useState<AdminUserListItem | null>(
    null,
  );

  const queryState = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);

    return {
      search: params.get("search") ?? "",
      role: params.get("role") ?? "",
      isActive: params.get("is_active") ?? "",
      sortBy: params.get("sortBy") ?? "created_at",
      sortOrder: params.get("sortOrder") ?? "desc",
      page: Number(params.get("page") ?? "1"),
      limit: Number(params.get("limit") ?? "10"),
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

  const queryString = useMemo(
    () => buildQueryFromParams(new URLSearchParams(searchParamsString)),
    [searchParamsString],
  );
  const usersQuery = useQuery({
    queryKey: ["admin-users", queryString],
    queryFn: ({ signal }) => fetchUsers(queryString, signal),
  });

  const statusMutation = useMutation({
    mutationFn: ({ isActive, userId }: { userId: string; isActive: boolean }) =>
      toggleUserStatus(userId, isActive),
    onSuccess: async (_, values) => {
      toast.success(values.isActive ? "User activated." : "User deactivated.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update user status.",
      );
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: (temporaryPassword) => {
      toast.success(`Temporary password: ${temporaryPassword}`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to reset password.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      setUserToDelete(null);
      toast.success("User deleted.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete user.",
      );
    },
  });

  const users = usersQuery.data?.data ?? [];
  const summary = usersQuery.data?.summary ?? {
    total: 0,
    admins: 0,
    members: 0,
    active: 0,
    inactive: 0,
    neverLoggedIn: 0,
    withTasks: 0,
    withoutTasks: 0,
  };
  const summaryCards = [
    {
      label: "Visible accounts",
      value: summary.total,
      helper: `${summary.members} normal users, ${summary.admins} admins`,
      icon: UserRound,
    },
    {
      label: "Active users",
      value: summary.active,
      helper: `${summary.inactive} inactive accounts`,
      icon: UserCheck,
    },
    {
      label: "Need onboarding",
      value: summary.neverLoggedIn,
      helper: "Accounts that have never signed in",
      icon: KeyRound,
    },
    {
      label: "No task history",
      value: summary.withoutTasks,
      helper: `${summary.withTasks} accounts already created tasks`,
      icon: Shield,
    },
  ];

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <PageIntro
            description="Search, sort, review, and control access for every account in the system."
            eyebrow="Admin users"
            title="User management with audit-friendly controls."
          />
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit bg-primary/10 px-4 py-2 text-primary">
              {usersQuery.data?.total ?? 0} total users
            </Badge>
            <Button
              onClick={() =>
                window.location.assign(`/api/admin/users/export?${queryString}`)
              }
              type="button"
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
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
              <Button
                onClick={() =>
                  setParams((params) => {
                    params.delete("role");
                    params.delete("is_active");
                    params.set("page", "1");
                  })
                }
                type="button"
                variant={!queryState.role && !queryState.isActive ? "default" : "outline"}
              >
                Everyone
              </Button>
              <Button
                onClick={() =>
                  setParams((params) => {
                    params.set("role", "USER");
                    params.delete("is_active");
                    params.set("page", "1");
                  })
                }
                type="button"
                variant={queryState.role === "USER" ? "default" : "outline"}
              >
                Normal users
              </Button>
              <Button
                onClick={() =>
                  setParams((params) => {
                    params.set("role", "ADMIN");
                    params.delete("is_active");
                    params.set("page", "1");
                  })
                }
                type="button"
                variant={queryState.role === "ADMIN" ? "default" : "outline"}
              >
                Admins
              </Button>
              <Button
                onClick={() =>
                  setParams((params) => {
                    params.delete("role");
                    params.set("is_active", "false");
                    params.set("page", "1");
                  })
                }
                type="button"
                variant={queryState.isActive === "false" ? "default" : "outline"}
              >
                Inactive
              </Button>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(5,minmax(0,1fr))]">
              <Input
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name or email..."
                value={searchInput}
              />
              <select
                className="h-11 rounded-2xl border border-input bg-background/80 px-4 text-sm"
                onChange={(event) =>
                  setParams((params) => {
                    if (event.target.value) {
                      params.set("role", event.target.value);
                    } else {
                      params.delete("role");
                    }
                    params.set("page", "1");
                  })
                }
                value={queryState.role}
              >
                <option value="">All roles</option>
                <option value="ADMIN">Admin</option>
                <option value="USER">User</option>
              </select>
              <select
                className="h-11 rounded-2xl border border-input bg-background/80 px-4 text-sm"
                onChange={(event) =>
                  setParams((params) => {
                    if (event.target.value) {
                      params.set("is_active", event.target.value);
                    } else {
                      params.delete("is_active");
                    }
                    params.set("page", "1");
                  })
                }
                value={queryState.isActive}
              >
                <option value="">All statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
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
                <option value="created_at">Joined</option>
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="role">Role</option>
                <option value="status">Status</option>
                <option value="task_count">Tasks</option>
                <option value="last_login">Last login</option>
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
              <select
                className="h-11 rounded-2xl border border-input bg-background/80 px-4 text-sm"
                onChange={(event) =>
                  setParams((params) => {
                    params.set("limit", event.target.value);
                    params.set("page", "1");
                  })
                }
                value={String(queryState.limit)}
              >
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/80 shadow-soft">
          <CardContent className="p-0">
            {usersQuery.isLoading ? (
              <div className="space-y-4 p-6">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton className="h-16 w-full" key={index} />
                ))}
              </div>
            ) : usersQuery.isError ? (
              <div className="p-6 text-sm text-destructive">
                {usersQuery.error instanceof Error
                  ? usersQuery.error.message
                  : "Unable to load users."}
              </div>
            ) : users.length === 0 ? (
              <div className="space-y-2 p-6">
                <p className="text-base font-medium">No users match this view.</p>
                <p className="text-sm text-muted-foreground">
                  Try clearing the current filters or searching for another
                  name or email address.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-sm">
                  <thead className="bg-secondary/45 text-left text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 font-medium">User</th>
                      <th className="px-6 py-4 font-medium">Email</th>
                      <th className="px-6 py-4 font-medium">Role</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Tasks</th>
                      <th className="px-6 py-4 font-medium">Joined</th>
                      <th className="px-6 py-4 font-medium">Last login</th>
                      <th className="px-6 py-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr className="border-t border-border/60" key={user.id}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              avatarUrl={user.avatarUrl}
                              name={user.name}
                              size="sm"
                            />
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {user.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {user.email}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              user.role === "ADMIN" ? "default" : "outline"
                            }
                          >
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={user.isActive ? "accent" : "outline"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">{user.taskCount}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {formatDisplayDateTime(user.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {user.lastLogin
                            ? formatDisplayDateTime(user.lastLogin)
                            : "Never"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/admin/users/${user.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </Button>
                            <Button
                              disabled={resetPasswordMutation.isPending}
                              onClick={() =>
                                resetPasswordMutation.mutate(user.id)
                              }
                              size="sm"
                              variant="outline"
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              Reset
                            </Button>
                            <Button
                              disabled={statusMutation.isPending}
                              onClick={() =>
                                statusMutation.mutate({
                                  userId: user.id,
                                  isActive: !user.isActive,
                                })
                              }
                              size="sm"
                              variant="outline"
                            >
                              {user.isActive ? (
                                <UserX className="mr-2 h-4 w-4" />
                              ) : (
                                <UserCheck className="mr-2 h-4 w-4" />
                              )}
                              {user.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              className="border-destructive/20 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => setUserToDelete(user)}
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

        <div className="flex items-center justify-between">
          <Button
            disabled={(usersQuery.data?.page ?? 1) <= 1}
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
            Page {usersQuery.data?.page ?? 1} of{" "}
            {usersQuery.data?.totalPages ?? 1}
          </p>
          <Button
            disabled={
              (usersQuery.data?.page ?? 1) >= (usersQuery.data?.totalPages ?? 1)
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

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setUserToDelete(null);
          }
        }}
        open={Boolean(userToDelete)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete?.name} and all of their data will be removed. This
              action cannot be undone.
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
                if (userToDelete) {
                  deleteMutation.mutate(userToDelete.id);
                }
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
