import { NextResponse, type NextRequest } from "next/server";
import { TaskHistoryAction } from "@prisma/client";

import { requireApiAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { deleteAttachmentFile } from "@/lib/uploads";
import {
  buildTaskHistoryDiff,
  buildTaskSnapshot,
  serializeAttachment,
} from "@/lib/tasks";
import { getRequestIp } from "@/lib/request";
import { logActivity } from "@/lib/activity-log";

async function getTask(taskId: string) {
  return db.task.findUnique({
    where: {
      id: taskId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      attachments: true,
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const task = await getTask(params.id);

  if (!task || task.deletedAt) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      id: task.id,
      date: task.date.toISOString(),
      ticketNumber: task.ticketNumber,
      ticketTitle: task.ticketTitle,
      ticketDescription: task.ticketDescription,
      storyPoint: task.storyPoint,
      status: task.status,
      flagged: task.flagged,
      createdAt: task.createdAt.toISOString(),
      dailyReport: task.dailyReport,
      user: task.user,
      attachments: task.attachments.map(serializeAttachment),
      tags: task.tags.map(({ tag }) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })),
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user: adminUser, response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const task = await getTask(params.id);

  if (!task || task.deletedAt) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  for (const attachment of task.attachments) {
    await deleteAttachmentFile(attachment.fileUrl);
  }

  const deletedAt = new Date();
  await db.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: task.id },
      data: {
        deletedAt,
      },
    });

    await tx.taskHistory.create({
      data: {
        taskId: task.id,
        userId: adminUser.id,
        action: TaskHistoryAction.DELETED,
        changes: buildTaskHistoryDiff({
          before: buildTaskSnapshot(task),
          after: {
            ...buildTaskSnapshot(task),
            deletedAt: deletedAt.toISOString(),
          },
        }),
      },
    });
  });

  await logActivity({
    action: "ADMIN_DELETE_TASK",
    userId: adminUser.id,
    targetId: task.id,
    targetType: "task",
    ipAddress: getRequestIp(request),
    metadata: {
      ownerId: task.userId,
      ticketNumber: task.ticketNumber,
    },
  });

  return NextResponse.json({ success: true });
}
