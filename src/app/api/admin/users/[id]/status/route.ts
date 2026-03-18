import { NextResponse, type NextRequest } from "next/server";

import { requireApiAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { getRequestIp } from "@/lib/request";
import { adminUserStatusSchema } from "@/lib/validations/admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user: adminUser, response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const targetUser = await db.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const body = await request.json();
  const parsedBody = adminUserStatusSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  if (targetUser.id === adminUser.id && parsedBody.data.isActive === false) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account here." },
      { status: 400 },
    );
  }

  if (
    targetUser.role === "ADMIN" &&
    targetUser.isActive &&
    parsedBody.data.isActive === false
  ) {
    const adminCount = await db.user.count({
      where: {
        role: "ADMIN",
        isActive: true,
      },
    });

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "You cannot deactivate the last active admin." },
        { status: 400 },
      );
    }
  }

  await db.user.update({
    where: { id: params.id },
    data: {
      isActive: parsedBody.data.isActive,
    },
  });

  await logActivity({
    action: parsedBody.data.isActive
      ? "ADMIN_ACTIVATE_USER"
      : "ADMIN_DEACTIVATE_USER",
    userId: adminUser.id,
    targetId: params.id,
    targetType: "user",
    ipAddress: getRequestIp(request),
    metadata: parsedBody.data,
  });

  return NextResponse.json({
    data: {
      isActive: parsedBody.data.isActive,
    },
  });
}
