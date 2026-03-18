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
import { bulkDeleteTasksSchema } from "@/lib/validations/task";

export async function POST(request: NextRequest) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  try {
    const body = await request.json();
    const parsedBody = bulkDeleteTasksSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const tasks = await db.task.findMany({
      where: {
        id: {
          in: parsedBody.data.taskIds,
        },
        userId: user.id,
        deletedAt: null,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!tasks.length) {
      return NextResponse.json({ error: "No tasks found." }, { status: 404 });
    }

    const deletedAt = new Date();

    await db.$transaction(async (tx) => {
      await tx.task.updateMany({
        where: {
          id: {
            in: tasks.map((task) => task.id),
          },
        },
        data: {
          deletedAt,
        },
      });

      for (const task of tasks) {
        await tx.taskHistory.create({
          data: {
            action: TaskHistoryAction.DELETED,
            taskId: task.id,
            userId: user.id,
            changes: buildTaskHistoryDiff({
              before: buildTaskSnapshot(task),
              after: {
                ...buildTaskSnapshot(task),
                deletedAt: deletedAt.toISOString(),
              },
            }),
          },
        });
      }
    });

    await logTaskActivity({
      action: "BULK_DELETE_TASKS",
      taskId: tasks[0]!.id,
      userId: user.id,
      ipAddress: getRequestIp(request),
      metadata: {
        count: tasks.length,
        taskIds: tasks.map((task) => task.id),
      },
    });

    return NextResponse.json({
      data: {
        count: tasks.length,
      },
    });
  } catch (error) {
    console.error("Bulk delete tasks route failed", error);
    return NextResponse.json(
      { error: "Unable to delete selected tasks right now." },
      { status: 500 },
    );
  }
}
