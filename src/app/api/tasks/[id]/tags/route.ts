import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";
import { ensureTags } from "@/lib/tasks";
import { taskTagsSchema } from "@/lib/validations/task";

export async function POST(
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

  try {
    const body = await request.json();
    const parsedBody = taskTagsSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const tags = await ensureTags(parsedBody.data.tags);

    if (tags.length) {
      await db.taskTag.createMany({
        data: tags.map((tag) => ({
          taskId: task.id,
          tagId: tag.id,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      data: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })),
    });
  } catch (error) {
    console.error("Attach tags route failed", error);
    return NextResponse.json(
      { error: "Unable to update tags right now." },
      { status: 500 },
    );
  }
}
