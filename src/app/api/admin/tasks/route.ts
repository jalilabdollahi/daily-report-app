import { NextResponse, type NextRequest } from "next/server";

import { requireApiAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { adminTasksQuerySchema } from "@/lib/validations/admin";

export async function GET(request: NextRequest) {
  const { response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const params = request.nextUrl.searchParams;
  const parsedQuery = adminTasksQuerySchema.safeParse({
    search: params.get("search") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
    sortBy: params.get("sortBy") ?? undefined,
    sortOrder: params.get("sortOrder") ?? undefined,
    userId: params.get("userId") ?? undefined,
    status: params.get("status") ?? undefined,
    flagged: params.get("flagged") ?? undefined,
    startDate: params.get("startDate") ?? undefined,
    endDate: params.get("endDate") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues[0]?.message ?? "Invalid query." },
      { status: 400 },
    );
  }

  const {
    endDate,
    flagged,
    limit,
    page,
    search,
    sortBy,
    sortOrder,
    startDate,
    status,
    userId,
  } = parsedQuery.data;

  const orderByMap = {
    date: { date: sortOrder },
    created_at: { createdAt: sortOrder },
    story_point: { storyPoint: sortOrder },
    ticket_number: { ticketNumber: sortOrder },
    ticket_title: { ticketTitle: sortOrder },
    user_name: { user: { name: sortOrder } },
  } as const;

  const where = {
    deletedAt: null,
    ...(userId ? { userId } : {}),
    ...(status ? { status } : {}),
    ...(flagged === "true" ? { flagged: true } : {}),
    ...(flagged === "false" ? { flagged: false } : {}),
    ...(startDate || endDate
      ? {
          date: {
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
    ...(search?.trim()
      ? {
          OR: [
            {
              ticketNumber: {
                contains: search.trim(),
                mode: "insensitive" as const,
              },
            },
            {
              ticketTitle: {
                contains: search.trim(),
                mode: "insensitive" as const,
              },
            },
            {
              ticketDescription: {
                contains: search.trim(),
                mode: "insensitive" as const,
              },
            },
            {
              dailyReport: {
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
  };

  const [tasks, total] = await Promise.all([
    db.task.findMany({
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
      orderBy: orderByMap[sortBy],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.task.count({ where }),
  ]);

  return NextResponse.json({
    data: tasks.map((task) => ({
      id: task.id,
      date: task.date.toISOString(),
      ticketNumber: task.ticketNumber,
      ticketTitle: task.ticketTitle,
      storyPoint: task.storyPoint,
      status: task.status,
      flagged: task.flagged,
      createdAt: task.createdAt.toISOString(),
      user: {
        id: task.user.id,
        name: task.user.name,
        email: task.user.email,
      },
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
