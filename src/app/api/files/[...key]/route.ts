import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";
import { getFileFromS3, validateStorageKey } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: { key: string[] } },
) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  const storageKey = params.key.join("/");

  try {
    validateStorageKey(storageKey);
  } catch {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
  }

  const [resourceType, resourceId] = params.key;

  if (resourceType === "attachments" && resourceId) {
    const task = await db.task.findUnique({
      where: { id: resourceId },
      select: { userId: true },
    });

    if (!task) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    if (user.role !== "ADMIN" && task.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const file = await getFileFromS3(storageKey);

    return new Response(file.body, {
      headers: {
        "Cache-Control": file.cacheControl,
        "Content-Disposition": file.contentDisposition ?? "inline",
        "Content-Length": String(file.contentLength),
        "Content-Type": file.contentType,
        ...(file.etag ? { ETag: file.etag } : {}),
        ...(file.lastModified ? { "Last-Modified": file.lastModified } : {}),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch the file.";
    const status = message === "File not found." ? 404 : 500;

    if (status === 500) {
      console.error("Serve file route failed", error);
    }

    return NextResponse.json({ error: message }, { status });
  }
}
