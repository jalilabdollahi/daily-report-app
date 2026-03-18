import { NextResponse, type NextRequest } from "next/server";

import { requireApiAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { deleteAttachmentFile, deleteAvatarFile } from "@/lib/uploads";
import { getRequestIp } from "@/lib/request";
import { adminUserUpdateSchema } from "@/lib/validations/admin";

async function getAdminUserDetail(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    return null;
  }

  const [tasks, activity, lastLogin] = await Promise.all([
    db.task.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        date: true,
        ticketNumber: true,
        ticketTitle: true,
        status: true,
        storyPoint: true,
        createdAt: true,
      },
    }),
    db.activityLog.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        metadata: true,
        createdAt: true,
      },
    }),
    db.activityLog.findFirst({
      where: {
        userId,
        action: "LOGIN",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
      },
    }),
  ]);

  const totalStoryPoints = tasks.reduce(
    (total, task) => total + (task.storyPoint ?? 0),
    0,
  );
  const lastActiveAt = activity[0]?.createdAt.toISOString() ?? null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    taskCount: tasks.length,
    createdAt: user.createdAt.toISOString(),
    lastLogin: lastLogin?.createdAt.toISOString() ?? null,
    totalStoryPoints,
    lastActiveAt,
    recentTasks: tasks.slice(0, 5).map((task) => ({
      id: task.id,
      date: task.date.toISOString(),
      ticketNumber: task.ticketNumber,
      ticketTitle: task.ticketTitle,
      status: task.status,
    })),
    recentActivity: activity.map((entry) => ({
      id: entry.id,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const user = await getAdminUserDetail(params.id);

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user: adminUser, response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const existingUser = await db.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!existingUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const body = await request.json();
  const parsedBody = adminUserUpdateSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  if (parsedBody.data.email !== existingUser.email) {
    const emailInUse = await db.user.findUnique({
      where: { email: parsedBody.data.email },
      select: { id: true },
    });

    if (emailInUse) {
      return NextResponse.json(
        { error: "That email is already in use." },
        { status: 409 },
      );
    }
  }

  if (
    existingUser.id === adminUser.id &&
    existingUser.role === "ADMIN" &&
    parsedBody.data.role === "USER"
  ) {
    const adminCount = await db.user.count({
      where: {
        role: "ADMIN",
        isActive: true,
      },
    });

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "You cannot demote the last active admin." },
        { status: 400 },
      );
    }
  }

  await db.user.update({
    where: { id: params.id },
    data: parsedBody.data,
  });

  await logActivity({
    action: "ADMIN_UPDATE_USER",
    userId: adminUser.id,
    targetId: params.id,
    targetType: "user",
    ipAddress: getRequestIp(request),
    metadata: parsedBody.data,
  });

  const updatedUser = await getAdminUserDetail(params.id);
  return NextResponse.json({ data: updatedUser });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user: adminUser, response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  if (params.id === adminUser.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account from the admin panel." },
      { status: 400 },
    );
  }

  const existingUser = await db.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      role: true,
      avatarUrl: true,
    },
  });

  if (!existingUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (existingUser.role === "ADMIN") {
    const adminCount = await db.user.count({
      where: {
        role: "ADMIN",
        isActive: true,
      },
    });

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "You cannot delete the last active admin." },
        { status: 400 },
      );
    }
  }

  const attachments = await db.attachment.findMany({
    where: {
      task: {
        userId: params.id,
      },
    },
    select: {
      fileUrl: true,
    },
  });

  for (const attachment of attachments) {
    await deleteAttachmentFile(attachment.fileUrl);
  }

  await deleteAvatarFile(existingUser.avatarUrl);
  await db.user.delete({
    where: {
      id: params.id,
    },
  });

  await logActivity({
    action: "ADMIN_DELETE_USER",
    userId: adminUser.id,
    targetId: params.id,
    targetType: "user",
    ipAddress: getRequestIp(request),
  });

  return NextResponse.json({ success: true });
}
