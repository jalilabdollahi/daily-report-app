import { Prisma, TaskStatus, TaskHistoryAction } from "@prisma/client";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import type { TaskQueryInput } from "@/lib/validations/task";

const TAG_COLOR_PALETTE = [
  "#0f766e",
  "#2563eb",
  "#f97316",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
];

export function buildTaskWhereClause({
  date,
  endDate,
  search,
  startDate,
  status,
  tags,
  userId,
}: {
  userId: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  status?: TaskQueryInput["status"];
  tags?: TaskQueryInput["tags"];
}): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {
    userId,
    deletedAt: null,
  };

  if (search?.trim()) {
    where.OR = [
      {
        ticketNumber: {
          contains: search.trim(),
          mode: "insensitive",
        },
      },
      {
        ticketTitle: {
          contains: search.trim(),
          mode: "insensitive",
        },
      },
      {
        ticketDescription: {
          contains: search.trim(),
          mode: "insensitive",
        },
      },
      {
        dailyReport: {
          contains: search.trim(),
          mode: "insensitive",
        },
      },
    ];
  }

  if (status?.length) {
    where.status = {
      in: status,
    };
  }

  if (tags?.length) {
    where.tags = {
      some: {
        tag: {
          name: {
            in: tags,
          },
        },
      },
    };
  }

  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    where.date = {
      gte: start,
      lt: end,
    };

    return where;
  }

  if (startDate || endDate) {
    where.date = {};

    if (startDate) {
      where.date.gte = new Date(`${startDate}T00:00:00.000Z`);
    }

    if (endDate) {
      const end = new Date(`${endDate}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      where.date.lt = end;
    }
  }

  return where;
}

export function buildTaskOrderBy({
  sortBy,
  sortOrder,
}: Pick<
  TaskQueryInput,
  "sortBy" | "sortOrder"
>): Prisma.TaskOrderByWithRelationInput[] {
  const orderByMap: Record<
    TaskQueryInput["sortBy"],
    Prisma.TaskOrderByWithRelationInput
  > = {
    date: { date: sortOrder },
    created_at: { createdAt: sortOrder },
    story_point: { storyPoint: sortOrder },
    ticket_number: { ticketNumber: sortOrder },
    ticket_title: { ticketTitle: sortOrder },
  };

  return [
    orderByMap[sortBy],
    ...(sortBy === "date" ? [{ createdAt: "desc" as const }] : []),
  ];
}

export function getTagColor(name: string) {
  const hash = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return TAG_COLOR_PALETTE[hash % TAG_COLOR_PALETTE.length];
}

export async function ensureTags(tagNames: string[]) {
  const uniqueNames = Array.from(
    new Set(tagNames.map((tag) => tag.trim()).filter(Boolean)),
  );

  if (!uniqueNames.length) {
    return [];
  }

  return Promise.all(
    uniqueNames.map((name) =>
      db.tag.upsert({
        where: { name },
        update: {},
        create: {
          name,
          color: getTagColor(name),
        },
      }),
    ),
  );
}

export async function syncTaskTags(taskId: string, tagNames: string[]) {
  await db.taskTag.deleteMany({
    where: { taskId },
  });

  const tags = await ensureTags(tagNames);

  if (tags.length) {
    await db.taskTag.createMany({
      data: tags.map((tag) => ({
        taskId,
        tagId: tag.id,
      })),
      skipDuplicates: true,
    });
  }

  return tags;
}

export function serializeTask(task: {
  id: string;
  date: Date;
  ticketNumber: string;
  ticketTitle: string;
  ticketDescription: string;
  storyPoint: number | null;
  dailyReport: string;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  tags?: Array<{ tag: { id: string; name: string; color: string | null } }>;
  _count?: { attachments: number };
}) {
  return {
    id: task.id,
    date: task.date.toISOString(),
    ticketNumber: task.ticketNumber,
    ticketTitle: task.ticketTitle,
    ticketDescription: task.ticketDescription,
    storyPoint: task.storyPoint ?? null,
    dailyReport: task.dailyReport,
    status: task.status,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    tags:
      task.tags?.map(({ tag }) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })) ?? [],
    attachmentsCount: task._count?.attachments ?? 0,
  };
}

export function serializeAttachment(attachment: {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: Date;
}) {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    fileType: attachment.fileType,
    fileSize: attachment.fileSize,
    createdAt: attachment.createdAt.toISOString(),
  };
}

export function groupTasksByDate<T extends { date: string }>(tasks: T[]) {
  const groups = new Map<string, T[]>();

  tasks.forEach((task) => {
    const key = task.date.slice(0, 10);
    const existingGroup = groups.get(key) ?? [];
    existingGroup.push(task);
    groups.set(key, existingGroup);
  });

  return Array.from(groups.entries()).map(([date, groupedTasks]) => ({
    date,
    tasks: groupedTasks,
  }));
}

export async function recordTaskHistory({
  action,
  changes,
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
  action: TaskHistoryAction;
  changes: Prisma.InputJsonValue;
}) {
  await db.taskHistory.create({
    data: {
      taskId,
      userId,
      action,
      changes,
    },
  });
}

export function buildTaskHistoryDiff({
  before,
  after,
}: {
  before?: Record<string, Prisma.JsonValue | null>;
  after?: Record<string, Prisma.JsonValue | null>;
}) {
  const sourceKeys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  const diff: Record<
    string,
    { before?: Prisma.JsonValue | null; after?: Prisma.JsonValue | null }
  > = {};

  sourceKeys.forEach((key) => {
    const previousValue = before?.[key];
    const nextValue = after?.[key];

    if (JSON.stringify(previousValue) === JSON.stringify(nextValue)) {
      return;
    }

    diff[key] = {
      before: previousValue,
      after: nextValue,
    };
  });

  return diff;
}

export function buildTaskSnapshot(task: {
  date?: Date | string;
  ticketNumber?: string;
  ticketTitle?: string;
  ticketDescription?: string;
  storyPoint?: number | null;
  dailyReport?: string;
  status?: TaskStatus | string;
  tags?: Array<{ tag?: { name: string } } | { name: string } | string>;
}) {
  return {
    date:
      typeof task.date === "string"
        ? task.date
        : task.date instanceof Date
          ? task.date.toISOString().slice(0, 10)
          : null,
    ticketNumber: task.ticketNumber ?? null,
    ticketTitle: task.ticketTitle ?? null,
    ticketDescription: task.ticketDescription ?? null,
    storyPoint: task.storyPoint ?? null,
    dailyReport: task.dailyReport ?? null,
    status: task.status ?? null,
    tags:
      task.tags?.map((tag) => {
        if (typeof tag === "string") {
          return tag;
        }

        if ("tag" in tag && tag.tag) {
          return tag.tag.name;
        }

        if ("name" in tag) {
          return tag.name;
        }

        return "";
      }).filter(Boolean) ?? [],
  };
}

export async function logTaskActivity({
  action,
  ipAddress,
  metadata,
  taskId,
  userId,
}: {
  action: string;
  userId: string;
  taskId: string;
  ipAddress?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await logActivity({
    action,
    userId,
    targetId: taskId,
    targetType: "task",
    ipAddress,
    metadata,
  });
}
