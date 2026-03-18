import { NextResponse, type NextRequest } from "next/server";

import { requireApiAdmin } from "@/lib/authz";
import { buildCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { adminUsersQuerySchema } from "@/lib/validations/admin";

export async function GET(request: NextRequest) {
  const { response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const params = request.nextUrl.searchParams;
  const parsedQuery = adminUsersQuerySchema.safeParse({
    search: params.get("search") ?? undefined,
    page: "1",
    limit: "5000",
    sortBy: params.get("sortBy") ?? undefined,
    sortOrder: params.get("sortOrder") ?? undefined,
    role: params.get("role") ?? undefined,
    is_active: params.get("is_active") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues[0]?.message ?? "Invalid export query." },
      { status: 400 },
    );
  }

  const { is_active, role, search } = parsedQuery.data;
  const users = await db.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(is_active ? { isActive: is_active === "true" } : {}),
      ...(search?.trim()
        ? {
            OR: [
              {
                name: {
                  contains: search.trim(),
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: search.trim(),
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      reminderEnabled: true,
      reminderTime: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const csv = buildCsv({
    headers: [
      "User ID",
      "Name",
      "Email",
      "Role",
      "Status",
      "Reminders Enabled",
      "Reminder Time",
      "Created At",
    ],
    rows: users.map((user) => [
      user.id,
      user.name,
      user.email,
      user.role,
      user.isActive ? "Active" : "Inactive",
      user.reminderEnabled ? "Yes" : "No",
      user.reminderTime,
      user.createdAt.toISOString(),
    ]),
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="users.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
