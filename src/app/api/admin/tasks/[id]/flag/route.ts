import { NextResponse, type NextRequest } from "next/server";

import { requireApiAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { getRequestIp } from "@/lib/request";
import { adminTaskFlagSchema } from "@/lib/validations/admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user: adminUser, response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const task = await db.task.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      flagged: true,
      userId: true,
      deletedAt: true,
      ticketNumber: true,
    },
  });

  if (!task || task.deletedAt) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const body = await request.json();
  const parsedBody = adminTaskFlagSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  await db.task.update({
    where: { id: params.id },
    data: {
      flagged: parsedBody.data.flagged,
    },
  });

  await logActivity({
    action: parsedBody.data.flagged ? "ADMIN_FLAG_TASK" : "ADMIN_UNFLAG_TASK",
    userId: adminUser.id,
    targetId: task.id,
    targetType: "task",
    ipAddress: getRequestIp(request),
    metadata: {
      ownerId: task.userId,
      ticketNumber: task.ticketNumber,
      flagged: parsedBody.data.flagged,
    },
  });

  return NextResponse.json({
    data: {
      flagged: parsedBody.data.flagged,
    },
  });
}
