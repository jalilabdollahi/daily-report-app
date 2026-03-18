import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; tagId: string } },
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

  await db.taskTag.delete({
    where: {
      taskId_tagId: {
        taskId: task.id,
        tagId: params.tagId,
      },
    },
  });

  return NextResponse.json({ success: true });
}
