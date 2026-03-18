import { NextResponse, type NextRequest } from "next/server";
import { TaskHistoryAction } from "@prisma/client";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";
import {
  buildTaskHistoryDiff,
  buildTaskSnapshot,
  logTaskActivity,
} from "@/lib/tasks";
import { getRequestIp } from "@/lib/request";

async function getPreviousTaskDay(userId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const latestTask = await db.task.findFirst({
    where: {
      userId,
      deletedAt: null,
      date: {
        lt: todayStart,
      },
    },
    orderBy: {
      date: "desc",
    },
    select: {
      date: true,
    },
  });

  if (!latestTask) {
    return null;
  }

  const dayStart = new Date(latestTask.date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const tasks = await db.task.findMany({
    where: {
      userId,
      deletedAt: null,
      date: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "asc" }],
  });

  return {
    date: dayStart,
    tasks,
  };
}

export async function GET() {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  const previousDay = await getPreviousTaskDay(user.id);

  if (!previousDay) {
    return NextResponse.json({
      data: null,
    });
  }

  return NextResponse.json({
    data: {
      date: previousDay.date.toISOString(),
      count: previousDay.tasks.length,
    },
  });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  try {
    const previousDay = await getPreviousTaskDay(user.id);

    if (!previousDay || !previousDay.tasks.length) {
      return NextResponse.json(
        { error: "No previous task day found to duplicate." },
        { status: 404 },
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingTodayTasks = await db.task.count({
      where: {
        userId: user.id,
        deletedAt: null,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    if (existingTodayTasks > 0) {
      return NextResponse.json(
        { error: "Today already has tasks. Duplicate only applies to an empty day." },
        { status: 400 },
      );
    }

    const createdTasks = await db.$transaction(async (tx) => {
      const duplicatedTasks = [];

      for (const task of previousDay.tasks) {
        const createdTask = await tx.task.create({
          data: {
            userId: user.id,
            date: today,
            ticketNumber: task.ticketNumber,
            ticketTitle: task.ticketTitle,
            ticketDescription: task.ticketDescription,
            storyPoint: task.storyPoint,
            dailyReport: "",
            status: "TODO",
          },
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        });

        if (task.tags.length) {
          await tx.taskTag.createMany({
            data: task.tags.map((tag) => ({
              taskId: createdTask.id,
              tagId: tag.tagId,
            })),
            skipDuplicates: true,
          });
        }

        await tx.taskHistory.create({
          data: {
            action: TaskHistoryAction.CREATED,
            taskId: createdTask.id,
            userId: user.id,
            changes: buildTaskHistoryDiff({
              before: {},
              after: {
                ...buildTaskSnapshot(task),
                date: today.toISOString().slice(0, 10),
                dailyReport: "",
                status: "TODO",
              },
            }),
          },
        });

        duplicatedTasks.push(createdTask);
      }

      return duplicatedTasks;
    });

    await logTaskActivity({
      action: "DUPLICATE_PREVIOUS_DAY_TASKS",
      taskId: createdTasks[0]!.id,
      userId: user.id,
      ipAddress: getRequestIp(request),
      metadata: {
        count: createdTasks.length,
        sourceDate: previousDay.date.toISOString(),
      },
    });

    return NextResponse.json({
      data: {
        date: previousDay.date.toISOString(),
        count: createdTasks.length,
      },
    });
  } catch (error) {
    console.error("Duplicate previous tasks route failed", error);
    return NextResponse.json(
      { error: "Unable to duplicate the previous day right now." },
      { status: 500 },
    );
  }
}
