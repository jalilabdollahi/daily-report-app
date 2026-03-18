import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";
import { deleteAttachmentFile } from "@/lib/uploads";

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: { id: string; attachmentId: string };
  },
) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  const attachment = await db.attachment.findFirst({
    where: {
      id: params.attachmentId,
      taskId: params.id,
      task: {
        userId: user.id,
        deletedAt: null,
      },
    },
  });

  if (!attachment) {
    return NextResponse.json(
      { error: "Attachment not found." },
      { status: 404 },
    );
  }

  await deleteAttachmentFile(attachment.fileUrl);
  await db.attachment.delete({
    where: {
      id: attachment.id,
    },
  });

  return NextResponse.json({ success: true });
}
