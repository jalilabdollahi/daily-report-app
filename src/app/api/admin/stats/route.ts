import { NextResponse } from "next/server";
import { subDays } from "date-fns";

import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/authz";
import { getTotalStorageBytes } from "@/lib/admin";

function buildLastThirtyDaysSeries() {
  return Array.from({ length: 30 }).map((_, index) => {
    const date = subDays(new Date(), 29 - index);
    const key = date.toISOString().slice(0, 10);

    return {
      date: key,
      count: 0,
    };
  });
}

export async function GET() {
  const { response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = subDays(todayStart, 6);
  const lastSevenDaysStart = subDays(todayStart, 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = subDays(todayStart, 29);

  const [
    users,
    tasks,
    storageUsedBytes,
    recentActivity,
    loginActivity,
    activeAnnouncements,
    activityToday,
    activityLast7Days,
    failedLogins7Days,
  ] = await Promise.all([
    db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),
    db.task.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        storyPoint: true,
        createdAt: true,
        status: true,
        flagged: true,
      },
    }),
    getTotalStorageBytes(),
    db.activityLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    db.activityLog.groupBy({
      by: ["userId"],
      where: {
        action: "LOGIN",
        userId: {
          not: null,
        },
      },
      _max: {
        createdAt: true,
      },
    }),
    db.announcement.count({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    db.activityLog.count({
      where: {
        createdAt: {
          gte: todayStart,
        },
      },
    }),
    db.activityLog.count({
      where: {
        createdAt: {
          gte: lastSevenDaysStart,
        },
      },
    }),
    db.activityLog.count({
      where: {
        action: "LOGIN_FAILED",
        createdAt: {
          gte: lastSevenDaysStart,
        },
      },
    }),
  ]);

  const registrationsPerDay = buildLastThirtyDaysSeries();
  const registrationsMap = new Map(
    registrationsPerDay.map((entry) => [entry.date, entry]),
  );
  const tasksPerDay = buildLastThirtyDaysSeries();
  const tasksMap = new Map(tasksPerDay.map((entry) => [entry.date, entry]));

  let activeUsers = 0;
  let adminUsers = 0;
  let memberUsers = 0;
  let inactiveUsers = 0;
  let neverLoggedIn = 0;
  let newThisWeek = 0;
  let newThisMonth = 0;
  const lastLoginMap = new Map(
    loginActivity.map((entry) => [
      entry.userId,
      entry._max.createdAt?.toISOString() ?? null,
    ]),
  );

  for (const user of users) {
    if (user.role === "ADMIN") {
      adminUsers += 1;
    } else {
      memberUsers += 1;
    }

    if (user.isActive) {
      activeUsers += 1;
    } else {
      inactiveUsers += 1;
    }

    if (!lastLoginMap.get(user.id)) {
      neverLoggedIn += 1;
    }

    if (user.createdAt >= weekStart) {
      newThisWeek += 1;
    }

    if (user.createdAt >= monthStart) {
      newThisMonth += 1;
    }

    const seriesEntry = registrationsMap.get(
      user.createdAt.toISOString().slice(0, 10),
    );
    if (seriesEntry) {
      seriesEntry.count += 1;
    }
  }

  let tasksToday = 0;
  let tasksThisWeek = 0;
  let tasksThisMonth = 0;
  let totalStoryPoints = 0;
  let doneTasks = 0;
  let blockedTasks = 0;
  let flaggedTasks = 0;
  const topUsersMap = new Map<
    string,
    { taskCount: number; storyPoints: number }
  >();

  for (const task of tasks) {
    if (task.createdAt >= todayStart) {
      tasksToday += 1;
    }

    if (task.createdAt >= weekStart) {
      tasksThisWeek += 1;
    }

    if (task.createdAt >= monthStart) {
      tasksThisMonth += 1;
    }

    if (task.status === "DONE") {
      doneTasks += 1;
    }

    if (task.status === "BLOCKED") {
      blockedTasks += 1;
    }

    if (task.flagged) {
      flaggedTasks += 1;
    }

    totalStoryPoints += task.storyPoint ?? 0;

    const existing = topUsersMap.get(task.userId) ?? {
      taskCount: 0,
      storyPoints: 0,
    };
    existing.taskCount += 1;
    existing.storyPoints += task.storyPoint ?? 0;
    topUsersMap.set(task.userId, existing);

    if (task.createdAt >= thirtyDaysAgo) {
      const seriesEntry = tasksMap.get(
        task.createdAt.toISOString().slice(0, 10),
      );
      if (seriesEntry) {
        seriesEntry.count += 1;
      }
    }
  }

  const usersById = new Map(users.map((user) => [user.id, user]));
  const topUsers = Array.from(topUsersMap.entries())
    .map(([userId, values]) => {
      const user = usersById.get(userId);
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        taskCount: values.taskCount,
        storyPoints: values.storyPoints,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .sort((left, right) => right.taskCount - left.taskCount)
    .slice(0, 5);

  const recentUsers = [...users]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 6)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      lastLogin: lastLoginMap.get(user.id) ?? null,
      taskCount: topUsersMap.get(user.id)?.taskCount ?? 0,
    }));

  const usersNeedingAttention = users
    .map((user) => {
      const lastLogin = lastLoginMap.get(user.id) ?? null;
      let reason = "";

      if (!user.isActive) {
        reason = "Inactive account";
      } else if (!lastLogin) {
        reason = "Never logged in";
      } else if ((topUsersMap.get(user.id)?.taskCount ?? 0) === 0) {
        reason = "No tasks yet";
      }

      if (!reason) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        reason,
        createdAt: user.createdAt.toISOString(),
        lastLogin,
        isActive: user.isActive,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .slice(0, 6);

  return NextResponse.json({
    data: {
      users: {
        total: users.length,
        admins: adminUsers,
        members: memberUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        neverLoggedIn,
        newThisWeek,
        newThisMonth,
      },
      tasks: {
        total: tasks.length,
        today: tasksToday,
        thisWeek: tasksThisWeek,
        thisMonth: tasksThisMonth,
        totalStoryPoints,
        done: doneTasks,
        blocked: blockedTasks,
        flagged: flaggedTasks,
      },
      activity: {
        today: activityToday,
        last7Days: activityLast7Days,
        failedLogins7Days,
      },
      announcements: {
        active: activeAnnouncements,
      },
      storageUsedBytes,
      topUsers,
      registrationsPerDay,
      tasksPerDay,
      recentActivity: recentActivity.map((entry) => ({
        id: entry.id,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        ipAddress: entry.ipAddress,
        createdAt: entry.createdAt.toISOString(),
        user: entry.user
          ? {
              id: entry.user.id,
              name: entry.user.name,
              email: entry.user.email,
            }
          : null,
      })),
      recentUsers,
      usersNeedingAttention,
    },
  });
}
