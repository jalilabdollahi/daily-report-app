import { NextResponse } from "next/server";

import { getAppConfig } from "@/lib/app-config";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";
import { saveAttachmentFiles } from "@/lib/uploads";
import { serializeAttachment } from "@/lib/tasks";

async function getOwnedTask(taskId: string, userId: string) {
  return db.task.findFirst({
    where: {
      id: taskId,
      userId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });
}

export async function GET(
  _request: Request,
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

  const attachments = await db.attachment.findMany({
    where: {
      taskId: task.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    data: attachments.map(serializeAttachment),
  });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  try {
    const task = await getOwnedTask(params.id, user.id);

    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);
    const config = await getAppConfig();

    if (!config.values.file_uploads_enabled) {
      return NextResponse.json(
        { error: "File uploads are currently disabled." },
        { status: 403 },
      );
    }

    const uploadedFiles = await saveAttachmentFiles(task.id, files, {
      maxFileSizeBytes: config.values.max_file_size_mb * 1024 * 1024,
    });
    const attachments = await Promise.all(
      uploadedFiles.map((file) =>
        db.attachment.create({
          data: {
            taskId: task.id,
            fileName: file.fileName,
            fileUrl: file.fileUrl,
            fileType: file.fileType,
            fileSize: file.fileSize,
          },
        }),
      ),
    );

    return NextResponse.json(
      {
        data: attachments.map(serializeAttachment),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Upload attachments route failed", error);
    return NextResponse.json(
      { error: "Unable to upload attachments right now." },
      { status: 500 },
    );
  }
}
