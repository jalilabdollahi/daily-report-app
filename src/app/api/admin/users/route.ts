import { NextResponse, type NextRequest } from "next/server";

import { requireApiAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { paginate } from "@/lib/admin";
import { adminUsersQuerySchema } from "@/lib/validations/admin";

export async function GET(request: NextRequest) {
  const { response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const params = request.nextUrl.searchParams;
  const parsedQuery = adminUsersQuerySchema.safeParse({
    search: params.get("search") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
    sortBy: params.get("sortBy") ?? undefined,
    sortOrder: params.get("sortOrder") ?? undefined,
    role: params.get("role") ?? undefined,
    is_active: params.get("is_active") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues[0]?.message ?? "Invalid query." },
      { status: 400 },
    );
  }

  const { search, page, limit, role, is_active, sortBy, sortOrder } =
    parsedQuery.data;
  const users = await db.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(is_active ? { isActive: is_active === "true" } : {}),
      ...(search?.trim()
        ? {
            OR: [
              {
                name: {
                  contains: search.trim(),
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: search.trim(),
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  const userIds = users.map((user) => user.id);
  const [taskCounts, loginActivity] = await Promise.all([
    userIds.length
      ? db.task.groupBy({
          by: ["userId"],
          where: {
            userId: {
              in: userIds,
            },
            deletedAt: null,
          },
          _count: {
            _all: true,
          },
        })
      : Promise.resolve([]),
    userIds.length
      ? db.activityLog.groupBy({
          by: ["userId"],
          where: {
            userId: {
              in: userIds,
            },
            action: "LOGIN",
          },
          _max: {
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const taskCountMap = new Map(
    taskCounts.map((entry) => [entry.userId, entry._count._all]),
  );
  const lastLoginMap = new Map(
    loginActivity.map((entry) => [
      entry.userId,
      entry._max.createdAt?.toISOString() ?? null,
    ]),
  );

  const normalizedUsers = users
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
      taskCount: taskCountMap.get(user.id) ?? 0,
      createdAt: user.createdAt.toISOString(),
      lastLogin: lastLoginMap.get(user.id) ?? null,
    }))
    .sort((left, right) => {
      const direction = sortOrder === "asc" ? 1 : -1;

      if (sortBy === "task_count") {
        return (left.taskCount - right.taskCount) * direction;
      }

      if (sortBy === "created_at") {
        return (
          (new Date(left.createdAt).getTime() -
            new Date(right.createdAt).getTime()) *
          direction
        );
      }

      if (sortBy === "last_login") {
        return (
          ((left.lastLogin ? new Date(left.lastLogin).getTime() : 0) -
            (right.lastLogin ? new Date(right.lastLogin).getTime() : 0)) *
          direction
        );
      }

      if (sortBy === "status") {
        return (
          String(left.isActive).localeCompare(String(right.isActive)) *
          direction
        );
      }

      return left[sortBy].localeCompare(right[sortBy]) * direction;
    });

  const summary = normalizedUsers.reduce(
    (accumulator, user) => {
      accumulator.total += 1;

      if (user.role === "ADMIN") {
        accumulator.admins += 1;
      } else {
        accumulator.members += 1;
      }

      if (user.isActive) {
        accumulator.active += 1;
      } else {
        accumulator.inactive += 1;
      }

      if (user.lastLogin) {
      } else {
        accumulator.neverLoggedIn += 1;
      }

      accumulator.withTasks += Number(user.taskCount > 0);
      accumulator.withoutTasks += Number(user.taskCount === 0);

      return accumulator;
    },
    {
      total: 0,
      admins: 0,
      members: 0,
      active: 0,
      inactive: 0,
      neverLoggedIn: 0,
      withTasks: 0,
      withoutTasks: 0,
    },
  );

  return NextResponse.json({
    ...paginate(normalizedUsers, page, limit),
    summary,
  });
}
