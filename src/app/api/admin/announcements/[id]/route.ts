import { NextResponse, type NextRequest } from "next/server";

import { requireApiAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { getRequestIp } from "@/lib/request";
import { adminAnnouncementSchema } from "@/lib/validations/admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const announcement = await db.announcement.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!announcement) {
    return NextResponse.json(
      { error: "Announcement not found." },
      { status: 404 },
    );
  }

  const body = await request.json();
  const parsedBody = adminAnnouncementSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const updatedAnnouncement = await db.announcement.update({
    where: { id: params.id },
    data: {
      title: parsedBody.data.title,
      message: parsedBody.data.message,
      expiresAt: parsedBody.data.expiresAt
        ? new Date(parsedBody.data.expiresAt)
        : null,
    },
    include: {
      admin: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  await logActivity({
    action: "ADMIN_UPDATE_ANNOUNCEMENT",
    userId: user.id,
    targetId: params.id,
    targetType: "announcement",
    ipAddress: getRequestIp(request),
    metadata: parsedBody.data,
  });

  return NextResponse.json({
    data: {
      id: updatedAnnouncement.id,
      title: updatedAnnouncement.title,
      message: updatedAnnouncement.message,
      isActive: updatedAnnouncement.isActive,
      createdAt: updatedAnnouncement.createdAt.toISOString(),
      expiresAt: updatedAnnouncement.expiresAt?.toISOString() ?? null,
      admin: updatedAnnouncement.admin,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const announcement = await db.announcement.findUnique({
    where: {
      id: params.id,
    },
    select: {
      id: true,
    },
  });

  if (!announcement) {
    return NextResponse.json(
      { error: "Announcement not found." },
      { status: 404 },
    );
  }

  await db.announcement.delete({
    where: {
      id: params.id,
    },
  });

  await logActivity({
    action: "ADMIN_DELETE_ANNOUNCEMENT",
    userId: user.id,
    targetId: params.id,
    targetType: "announcement",
    ipAddress: getRequestIp(request),
  });

  return NextResponse.json({ success: true });
}
