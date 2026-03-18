import { NextResponse, type NextRequest } from "next/server";

import { requireApiAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { adminActivityQuerySchema } from "@/lib/validations/admin";

export async function GET(request: NextRequest) {
  const { response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const params = request.nextUrl.searchParams;
  const parsedQuery = adminActivityQuerySchema.safeParse({
    search: params.get("search") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
    sortOrder: params.get("sortOrder") ?? undefined,
    action: params.get("action") ?? undefined,
    userId: params.get("userId") ?? undefined,
    startDate: params.get("startDate") ?? undefined,
    endDate: params.get("endDate") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues[0]?.message ?? "Invalid query." },
      { status: 400 },
    );
  }

  const { action, endDate, limit, page, search, sortOrder, startDate, userId } =
    parsedQuery.data;
  const where = {
    ...(action ? { action } : {}),
    ...(userId ? { userId } : {}),
    ...(search?.trim()
      ? {
          OR: [
            {
              action: {
                contains: search.trim(),
                mode: "insensitive" as const,
              },
            },
            {
              user: {
                is: {
                  OR: [
                    {
                      name: {
                        contains: search.trim(),
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      email: {
                        contains: search.trim(),
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : {}),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate
              ? {
                  gte: new Date(`${startDate}T00:00:00.000Z`),
                }
              : {}),
            ...(endDate
              ? {
                  lt: new Date(`${endDate}T23:59:59.999Z`),
                }
              : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.activityLog.count({ where }),
  ]);

  const [uniqueActors, failedLogins, taskEvents, authEvents, topActions] =
    await Promise.all([
      db.activityLog.findMany({
        where: {
          ...where,
          userId: {
            not: null,
          },
        },
        distinct: ["userId"],
        select: {
          userId: true,
        },
      }),
      db.activityLog.count({
        where: {
          ...where,
          action: "LOGIN_FAILED",
        },
      }),
      db.activityLog.count({
        where: {
          ...where,
          targetType: "task",
        },
      }),
      db.activityLog.count({
        where: {
          ...where,
          action: {
            in: [
              "LOGIN",
              "LOGIN_FAILED",
              "LOGOUT",
              "REQUEST_PASSWORD_RESET",
              "RESET_PASSWORD",
            ],
          },
        },
      }),
      db.activityLog.groupBy({
        by: ["action"],
        where,
        _count: {
          _all: true,
        },
      }),
    ]);

  return NextResponse.json({
    data: items.map((entry) => ({
      id: entry.id,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      ipAddress: entry.ipAddress,
      metadata: entry.metadata,
      createdAt: entry.createdAt.toISOString(),
      user: entry.user
        ? {
            id: entry.user.id,
            name: entry.user.name,
            email: entry.user.email,
          }
        : null,
      })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary: {
      total,
      uniqueActors: uniqueActors.length,
      taskEvents,
      authEvents,
      failedLogins,
      topActions: topActions
        .sort((left, right) => right._count._all - left._count._all)
        .slice(0, 5)
        .map((entry) => ({
          action: entry.action,
          count: entry._count._all,
        })),
    },
  });
}
