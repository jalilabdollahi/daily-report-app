import {
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subDays,
} from "date-fns";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";
import type { DashboardStats } from "@/types/dashboard";
import { serializeTask } from "@/lib/tasks";

export async function GET() {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  const todayStart = startOfToday();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const chartStart = subDays(todayStart, 6);

  const baseWhere = {
    userId: user.id,
    deletedAt: null,
  } as const;

  const [
    totalTasks,
    todayTasks,
    thisWeekTasks,
    thisMonthTasks,
    totals,
    weeklyTotals,
    monthlyTotals,
    todoTasks,
    inProgressTasks,
    doneTasks,
    blockedTasks,
    recentTasks,
    chartTasks,
  ] = await db.$transaction([
    db.task.count({ where: baseWhere }),
    db.task.count({
      where: {
        ...baseWhere,
        date: { gte: todayStart },
      },
    }),
    db.task.count({
      where: {
        ...baseWhere,
        date: { gte: weekStart, lte: weekEnd },
      },
    }),
    db.task.count({
      where: {
        ...baseWhere,
        date: { gte: monthStart, lte: monthEnd },
      },
    }),
    db.task.aggregate({
      where: baseWhere,
      _sum: { storyPoint: true },
    }),
    db.task.aggregate({
      where: {
        ...baseWhere,
        date: { gte: weekStart, lte: weekEnd },
      },
      _sum: { storyPoint: true },
    }),
    db.task.aggregate({
      where: {
        ...baseWhere,
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { storyPoint: true },
    }),
    db.task.count({
      where: {
        ...baseWhere,
        status: "TODO",
      },
    }),
    db.task.count({
      where: {
        ...baseWhere,
        status: "IN_PROGRESS",
      },
    }),
    db.task.count({
      where: {
        ...baseWhere,
        status: "DONE",
      },
    }),
    db.task.count({
      where: {
        ...baseWhere,
        status: "BLOCKED",
      },
    }),
    db.task.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        tags: { include: { tag: true } },
        _count: { select: { attachments: true } },
      },
    }),
    db.task.findMany({
      where: {
        ...baseWhere,
        date: { gte: chartStart },
      },
      select: {
        date: true,
      },
    }),
  ]);

  const tasksByStatus: DashboardStats["tasksByStatus"] = {
    TODO: todoTasks,
    IN_PROGRESS: inProgressTasks,
    DONE: doneTasks,
    BLOCKED: blockedTasks,
  };

  const tasksPerDay = Array.from({ length: 7 }).map((_, index) => {
    const date = subDays(todayStart, 6 - index);
    const key = date.toISOString().slice(0, 10);
    const count = chartTasks.filter(
      (task) => task.date.toISOString().slice(0, 10) === key,
    ).length;

    return {
      date: key,
      count,
    };
  });

  const payload: DashboardStats = {
    totalTasks,
    todayTasks,
    thisWeekTasks,
    thisMonthTasks,
    totalStoryPoints: totals._sum.storyPoint ?? 0,
    thisWeekStoryPoints: weeklyTotals._sum.storyPoint ?? 0,
    thisMonthStoryPoints: monthlyTotals._sum.storyPoint ?? 0,
    tasksByStatus,
    recentTasks: recentTasks.map((task) => ({
      id: task.id,
      date: task.date.toISOString(),
      ticketNumber: task.ticketNumber,
      ticketTitle: task.ticketTitle,
      status: serializeTask(task).status,
    })),
    tasksPerDay,
  };

  return NextResponse.json({ data: payload });
}
