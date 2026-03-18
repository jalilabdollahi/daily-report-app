import { NextResponse, type NextRequest } from "next/server";
import { TaskHistoryAction } from "@prisma/client";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";
import {
  buildTaskHistoryDiff,
  buildTaskOrderBy,
  buildTaskSnapshot,
  buildTaskWhereClause,
  groupTasksByDate,
  logTaskActivity,
  recordTaskHistory,
  serializeTask,
  syncTaskTags,
} from "@/lib/tasks";
import { getRequestIp } from "@/lib/request";
import { createTaskSchema, taskQuerySchema } from "@/lib/validations/task";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  const params = request.nextUrl.searchParams;
  const parsedQuery = taskQuerySchema.safeParse({
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
    date: params.get("date") ?? undefined,
    startDate: params.get("startDate") ?? undefined,
    endDate: params.get("endDate") ?? undefined,
    search: params.get("search") ?? undefined,
    status:
      params.getAll("status").length > 0
        ? params.getAll("status")
        : (params.get("status") ?? undefined),
    tags:
      params.getAll("tags").length > 0
        ? params.getAll("tags")
        : (params.get("tags") ?? undefined),
    sortBy: params.get("sortBy") ?? undefined,
    sortOrder: params.get("sortOrder") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues[0]?.message ?? "Invalid query." },
      { status: 400 },
    );
  }

  const {
    date,
    endDate,
    limit,
    page,
    search,
    sortBy,
    sortOrder,
    startDate,
    status,
    tags,
  } = parsedQuery.data;
  const where = buildTaskWhereClause({
    userId: user.id,
    date,
    startDate,
    endDate,
    search,
    status,
    tags,
  });
  const orderBy = buildTaskOrderBy({ sortBy, sortOrder });

  const [tasks, total] = await db.$transaction([
    db.task.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            attachments: true,
          },
        },
      },
    }),
    db.task.count({ where }),
  ]);

  const serializedTasks = tasks.map(serializeTask);
  const groupedTasks = groupTasksByDate(serializedTasks).sort((left, right) => {
    if (sortBy === "date") {
      return sortOrder === "asc"
        ? left.date.localeCompare(right.date)
        : right.date.localeCompare(left.date);
    }

    return right.date.localeCompare(left.date);
  });

  return NextResponse.json({
    data: groupedTasks,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  try {
    const body = await request.json();
    const parsedBody = createTaskSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const {
      date,
      dailyReport,
      status,
      storyPoint,
      tags,
      ticketDescription,
      ticketNumber,
      ticketTitle,
    } = parsedBody.data;

    const task = await db.task.create({
      data: {
        userId: user.id,
        date: new Date(`${date}T00:00:00.000Z`),
        ticketNumber,
        ticketTitle,
        ticketDescription,
        storyPoint: storyPoint ?? null,
        dailyReport,
        status,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            attachments: true,
          },
        },
      },
    });

    const syncedTags = await syncTaskTags(task.id, tags);

    await recordTaskHistory({
      action: TaskHistoryAction.CREATED,
      taskId: task.id,
      userId: user.id,
      changes: buildTaskHistoryDiff({
        before: {},
        after: buildTaskSnapshot({
          date,
          ticketNumber,
          ticketTitle,
          ticketDescription,
          storyPoint: storyPoint ?? null,
          dailyReport,
          status,
          tags: syncedTags.map((tag) => tag.name),
        }),
      }),
    });

    await logTaskActivity({
      action: "CREATE_TASK",
      taskId: task.id,
      userId: user.id,
      ipAddress: getRequestIp(request),
      metadata: { ticketNumber, status },
    });

    const refreshedTask = await db.task.findUniqueOrThrow({
      where: { id: task.id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            attachments: true,
          },
        },
      },
    });

    return NextResponse.json(
      { data: serializeTask(refreshedTask) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create task route failed", error);
    return NextResponse.json(
      { error: "Unable to create task right now." },
      { status: 500 },
    );
  }
}
