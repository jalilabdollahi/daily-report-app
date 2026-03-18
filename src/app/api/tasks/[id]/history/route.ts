import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";

export async function GET(
  _request: Request,
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
    },
    select: {
      id: true,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const history = await db.taskHistory.findMany({
    where: {
      taskId: task.id,
    },
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
  });

  return NextResponse.json({
    data: history.map((entry) => ({
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
  });
}
