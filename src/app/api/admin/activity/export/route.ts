import { NextResponse, type NextRequest } from "next/server";

import { requireApiAdmin } from "@/lib/authz";
import { buildCsv } from "@/lib/csv";
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
    page: "1",
    limit: "5000",
    sortOrder: params.get("sortOrder") ?? undefined,
    action: params.get("action") ?? undefined,
    userId: params.get("userId") ?? undefined,
    startDate: params.get("startDate") ?? undefined,
    endDate: params.get("endDate") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues[0]?.message ?? "Invalid export query." },
      { status: 400 },
    );
  }

  const { action, endDate, limit, search, sortOrder, startDate, userId } = parsedQuery.data;
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
            ...(startDate ? { gte: new Date(`${startDate}T00:00:00.000Z`) } : {}),
            ...(endDate ? { lt: new Date(`${endDate}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const items = await db.activityLog.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: sortOrder,
    },
    take: limit,
  });

  const csv = buildCsv({
    headers: ["Timestamp", "User", "Action", "Target", "IP Address", "Details"],
    rows: items.map((entry) => [
      entry.createdAt.toISOString(),
      entry.user ? `${entry.user.name} <${entry.user.email}>` : "System",
      entry.action,
      [entry.targetType, entry.targetId].filter(Boolean).join(":"),
      entry.ipAddress ?? "",
      JSON.stringify(entry.metadata ?? {}),
    ]),
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="activity-log.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
