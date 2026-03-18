import { NextResponse, type NextRequest } from "next/server";

import { requireApiAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { getRequestIp } from "@/lib/request";
import {
  adminAnnouncementSchema,
  adminAnnouncementsQuerySchema,
} from "@/lib/validations/admin";

export async function GET(request: NextRequest) {
  const { response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const params = request.nextUrl.searchParams;
  const parsedQuery = adminAnnouncementsQuerySchema.safeParse({
    search: params.get("search") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
    sortOrder: params.get("sortOrder") ?? undefined,
    status: params.get("status") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues[0]?.message ?? "Invalid query." },
      { status: 400 },
    );
  }

  const { limit, page, search, sortOrder, status } = parsedQuery.data;

  const where = {
    ...(search?.trim()
      ? {
          OR: [
            {
              title: {
                contains: search.trim(),
                mode: "insensitive" as const,
              },
            },
            {
              message: {
                contains: search.trim(),
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
  };

  const [announcements, total] = await Promise.all([
    db.announcement.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.announcement.count({ where }),
  ]);

  return NextResponse.json({
    data: announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      isActive: announcement.isActive,
      createdAt: announcement.createdAt.toISOString(),
      expiresAt: announcement.expiresAt?.toISOString() ?? null,
      admin: {
        id: announcement.admin.id,
        name: announcement.admin.name,
      },
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const body = await request.json();
  const parsedBody = adminAnnouncementSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const announcement = await db.announcement.create({
    data: {
      adminId: user.id,
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
    action: "ADMIN_CREATE_ANNOUNCEMENT",
    userId: user.id,
    targetId: announcement.id,
    targetType: "announcement",
    ipAddress: getRequestIp(request),
    metadata: parsedBody.data,
  });

  return NextResponse.json(
    {
      data: {
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        isActive: announcement.isActive,
        createdAt: announcement.createdAt.toISOString(),
        expiresAt: announcement.expiresAt?.toISOString() ?? null,
        admin: announcement.admin,
      },
    },
    { status: 201 },
  );
}
