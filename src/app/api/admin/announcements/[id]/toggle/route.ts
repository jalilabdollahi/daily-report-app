import { NextResponse, type NextRequest } from "next/server";

import { requireApiAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { getRequestIp } from "@/lib/request";

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
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!announcement) {
    return NextResponse.json(
      { error: "Announcement not found." },
      { status: 404 },
    );
  }

  const updated = await db.announcement.update({
    where: {
      id: params.id,
    },
    data: {
      isActive: !announcement.isActive,
    },
  });

  await logActivity({
    action: updated.isActive
      ? "ADMIN_ACTIVATE_ANNOUNCEMENT"
      : "ADMIN_DEACTIVATE_ANNOUNCEMENT",
    userId: user.id,
    targetId: params.id,
    targetType: "announcement",
    ipAddress: getRequestIp(request),
  });

  return NextResponse.json({
    data: {
      isActive: updated.isActive,
    },
  });
}
