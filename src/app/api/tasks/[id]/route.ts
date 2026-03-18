import { NextResponse, type NextRequest } from "next/server";
import { Prisma, TaskHistoryAction } from "@prisma/client";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";
import {
  buildTaskHistoryDiff,
  buildTaskSnapshot,
  logTaskActivity,
  recordTaskHistory,
  serializeAttachment,
  serializeTask,
  syncTaskTags,
} from "@/lib/tasks";
import { getRequestIp } from "@/lib/request";
import { updateTaskSchema } from "@/lib/validations/task";

async function getOwnedTask(taskId: string, userId: string) {
  return db.task.findFirst({
    where: {
      id: taskId,
      userId,
      deletedAt: null,
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      attachments: true,
      history: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          attachments: true,
        },
      },
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  const task = await getOwnedTask(params.id, user.id);

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      ...serializeTask(task),
      attachments: task.attachments.map(serializeAttachment),
      history: task.history.map((entry) => ({
        id: entry.id,
        action: entry.action,
        changes: entry.changes,
        createdAt: entry.createdAt.toISOString(),
        user: entry.user
          ? {
              id: entry.user.id,
              name: entry.user.name,
              email: entry.user.email,
            }
          : null,
      })),
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  try {
    const existingTask = await getOwnedTask(params.id, user.id);

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const body = await request.json();
    const parsedBody = updateTaskSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const payload = parsedBody.data;
    const updateData: Record<string, unknown> = {};
    const beforeSnapshot = buildTaskSnapshot(existingTask);

    if (payload.date) {
      updateData.date = new Date(`${payload.date}T00:00:00.000Z`);
    }

    if (payload.ticketNumber !== undefined) {
      updateData.ticketNumber = payload.ticketNumber;
    }

    if (payload.ticketTitle !== undefined) {
      updateData.ticketTitle = payload.ticketTitle;
    }

    if (payload.ticketDescription !== undefined) {
      updateData.ticketDescription = payload.ticketDescription;
    }

    if (payload.storyPoint !== undefined) {
      updateData.storyPoint = payload.storyPoint ?? null;
    }

    if (payload.dailyReport !== undefined) {
      updateData.dailyReport = payload.dailyReport;
    }

    if (payload.status !== undefined) {
      updateData.status = payload.status;
    }

    if (Object.keys(updateData).length) {
      await db.task.update({
        where: { id: existingTask.id },
        data: updateData,
      });
    }

    if (payload.tags) {
      await syncTaskTags(existingTask.id, payload.tags);
    }

    const refreshedTask = await getOwnedTask(existingTask.id, user.id);
    const changes = buildTaskHistoryDiff({
      before: beforeSnapshot,
      after: buildTaskSnapshot(refreshedTask!),
    });

    await recordTaskHistory({
      action: TaskHistoryAction.UPDATED,
      taskId: existingTask.id,
      userId: user.id,
      changes: changes as Prisma.InputJsonValue,
    });

    await logTaskActivity({
      action: "EDIT_TASK",
      taskId: existingTask.id,
      userId: user.id,
      ipAddress: getRequestIp(request),
      metadata: changes as Prisma.InputJsonValue,
    });

    return NextResponse.json({
      data: {
        ...serializeTask(refreshedTask!),
        attachments: refreshedTask!.attachments.map(serializeAttachment),
        history: refreshedTask!.history.map((entry) => ({
          id: entry.id,
          action: entry.action,
          changes: entry.changes,
          createdAt: entry.createdAt.toISOString(),
          user: entry.user
            ? {
                id: entry.user.id,
                name: entry.user.name,
                email: entry.user.email,
              }
            : null,
        })),
      },
    });
  } catch (error) {
    console.error("Update task route failed", error);
    return NextResponse.json(
      { error: "Unable to update task right now." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  const task = await db.task.findFirst({
    where: {
      id: params.id,
      userId: user.id,
      deletedAt: null,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  await db.task.update({
    where: { id: task.id },
    data: {
      deletedAt: new Date(),
    },
  });

  await recordTaskHistory({
    action: TaskHistoryAction.DELETED,
    taskId: task.id,
    userId: user.id,
    changes: buildTaskHistoryDiff({
      before: buildTaskSnapshot(task),
      after: {
        ...buildTaskSnapshot(task),
        deletedAt: new Date().toISOString(),
      },
    }),
  });

  await logTaskActivity({
    action: "DELETE_TASK",
    taskId: task.id,
    userId: user.id,
    ipAddress: getRequestIp(request),
    metadata: { ticketNumber: task.ticketNumber },
  });

  return NextResponse.json({ success: true });
}
