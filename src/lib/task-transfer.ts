import PDFDocument from "pdfkit";
import Papa from "papaparse";
import { TaskHistoryAction, TaskStatus } from "@prisma/client";

import { logActivity } from "@/lib/activity-log";
import { db } from "@/lib/db";
import { buildCsv, createAttachmentFilename } from "@/lib/csv";
import {
  buildTaskHistoryDiff,
  buildTaskSnapshot,
  buildTaskWhereClause,
  ensureTags,
  recordTaskHistory,
} from "@/lib/tasks";
import {
  createTaskSchema,
  taskStatusSchema,
  taskTagNamesSchema,
} from "@/lib/validations/task";
import { formatDisplayDate, formatTaskGroupLabel, stripHtml } from "@/lib/utils";

type TaskTransferRecord = {
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
  tags: Array<{ tag: { name: string; color: string | null } }>;
};

export type TaskExportFilters = {
  userId: string;
  startDate: string;
  endDate: string;
  status?: TaskStatus[];
  tags?: string[];
};

export type TaskImportError = {
  row: number;
  field: string;
  message: string;
};

type NormalizedImportTask = {
  date: string;
  ticketNumber: string;
  ticketTitle: string;
  ticketDescription: string;
  storyPoint: number | null;
  status: TaskStatus;
  tags: string[];
  dailyReport: string;
};

const CSV_HEADERS = [
  "Date",
  "Ticket Number",
  "Ticket Title",
  "Ticket Description",
  "Story Point",
  "Status",
  "Tags",
  "Daily Report",
  "Created At",
  "Updated At",
];

const TEMPLATE_HEADERS = CSV_HEADERS.slice(0, 8);

const CSV_ALIAS_GROUPS: Record<string, string[]> = {
  date: ["date", "task date", "logged date", "work date"],
  ticketNumber: ["ticket number", "ticket_number", "ticket", "issue key", "jira"],
  ticketTitle: ["ticket title", "ticket_title", "title", "summary"],
  ticketDescription: [
    "ticket description",
    "ticket_description",
    "description",
    "details",
  ],
  storyPoint: ["story point", "story points", "story_point", "points", "sp"],
  status: ["status", "task status"],
  tags: ["tags", "labels", "tag list"],
  dailyReport: ["daily report", "daily_report", "report", "notes"],
};

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function buildTaskExportFilename(format: "csv" | "json" | "pdf") {
  return createAttachmentFilename({
    prefix: "daily-report",
    extension: format,
  });
}

function normalizeTaskStatus(value?: string | null) {
  const normalized = value?.trim().toUpperCase().replace(/\s+/g, "_");
  const parsed = taskStatusSchema.safeParse(normalized);
  return parsed.success ? parsed.data : "TODO";
}

function normalizeTagList(value?: string | string[] | null) {
  const list = Array.isArray(value)
    ? value
    : String(value ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

  const parsed = taskTagNamesSchema.safeParse(list);
  return parsed.success ? parsed.data : [];
}

function resolveCsvMapping(headers: string[]) {
  const normalizedHeaders = headers.reduce<Record<string, string>>((acc, header) => {
    acc[normalizeHeader(header)] = header;
    return acc;
  }, {});

  return Object.entries(CSV_ALIAS_GROUPS).reduce<Record<string, string | null>>(
    (acc, [field, aliases]) => {
      const match = aliases.find((alias) => normalizedHeaders[normalizeHeader(alias)]);
      acc[field] = match ? normalizedHeaders[normalizeHeader(match)] : null;
      return acc;
    },
    {},
  );
}

function getMappedValue(
  row: Record<string, string>,
  mapping: Record<string, string | null>,
  field: keyof typeof CSV_ALIAS_GROUPS,
) {
  const column = mapping[field];
  return column ? row[column] ?? "" : "";
}

function normalizeImportTask(
  source: Record<string, unknown>,
  rowNumber: number,
): { task: NormalizedImportTask | null; errors: TaskImportError[] } {
  const errors: TaskImportError[] = [];

  const date = String(source.date ?? "").trim();
  const ticketNumber = String(source.ticketNumber ?? "").trim();
  const ticketTitle = String(source.ticketTitle ?? "").trim();
  const ticketDescription = String(source.ticketDescription ?? "").trim();
  const dailyReport = String(source.dailyReport ?? "").trim();
  const status = normalizeTaskStatus(
    typeof source.status === "string" ? source.status : null,
  );
  const tags = normalizeTagList(
    Array.isArray(source.tags) ? (source.tags as string[]) : String(source.tags ?? ""),
  );

  let storyPoint: number | null = null;
  if (source.storyPoint !== undefined && source.storyPoint !== null && String(source.storyPoint).trim() !== "") {
    const parsedNumber = Number(source.storyPoint);
    if (Number.isNaN(parsedNumber)) {
      errors.push({
        row: rowNumber,
        field: "story_point",
        message: "Story point must be a number.",
      });
    } else {
      storyPoint = parsedNumber;
    }
  }

  const parsedTask = createTaskSchema.safeParse({
    date,
    ticketNumber,
    ticketTitle,
    ticketDescription,
    storyPoint,
    dailyReport,
    status,
    tags,
  });

  if (!parsedTask.success) {
    for (const issue of parsedTask.error.issues) {
      errors.push({
        row: rowNumber,
        field: issue.path[0]?.toString() ?? "row",
        message: issue.message,
      });
    }
    return { task: null, errors };
  }

  return {
    task: {
      date: parsedTask.data.date,
      ticketNumber: parsedTask.data.ticketNumber,
      ticketTitle: parsedTask.data.ticketTitle,
      ticketDescription: parsedTask.data.ticketDescription,
      storyPoint: parsedTask.data.storyPoint ?? null,
      status: parsedTask.data.status,
      tags: parsedTask.data.tags,
      dailyReport: parsedTask.data.dailyReport,
    },
    errors,
  };
}

export async function getTasksForTransfer(filters: TaskExportFilters) {
  return db.task.findMany({
    where: buildTaskWhereClause({
      userId: filters.userId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      status: filters.status,
      tags: filters.tags,
    }),
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}

export function buildTaskExportCsv(tasks: TaskTransferRecord[]) {
  return buildCsv({
    headers: CSV_HEADERS,
    rows: tasks.map((task) => [
      task.date.toISOString().slice(0, 10),
      task.ticketNumber,
      task.ticketTitle,
      task.ticketDescription,
      task.storyPoint ?? "",
      task.status,
      task.tags.map(({ tag }) => tag.name).join(", "),
      stripHtml(task.dailyReport),
      task.createdAt.toISOString(),
      task.updatedAt.toISOString(),
    ]),
  });
}

export function buildTaskExportJson(tasks: TaskTransferRecord[]) {
  return JSON.stringify(
    tasks.map((task) => ({
      id: task.id,
      date: task.date.toISOString(),
      ticketNumber: task.ticketNumber,
      ticketTitle: task.ticketTitle,
      ticketDescription: task.ticketDescription,
      storyPoint: task.storyPoint,
      status: task.status,
      tags: task.tags.map(({ tag }) => tag.name),
      dailyReport: task.dailyReport,
      dailyReportText: stripHtml(task.dailyReport),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    })),
    null,
    2,
  );
}

function ensurePdfSpace(doc: PDFDocument, minimumHeight = 72) {
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  if (doc.y + minimumHeight > bottomLimit) {
    doc.addPage();
  }
}

export async function buildTaskExportPdf({
  tasks,
  userName,
  startDate,
  endDate,
}: {
  tasks: TaskTransferRecord[];
  userName: string;
  startDate: string;
  endDate: string;
}) {
  const document = new PDFDocument({
    size: "A4",
    margin: 50,
    bufferPages: true,
  });

  const chunks: Buffer[] = [];
  document.on("data", (chunk) => {
    chunks.push(chunk as Buffer);
  });

  const groupedTasks = tasks.reduce<Map<string, TaskTransferRecord[]>>((acc, task) => {
    const key = task.date.toISOString().slice(0, 10);
    const existing = acc.get(key) ?? [];
    existing.push(task);
    acc.set(key, existing);
    return acc;
  }, new Map());

  document.fontSize(22).fillColor("#0f766e").text("Daily Report");
  document.moveDown(0.3);
  document
    .fontSize(11)
    .fillColor("#475569")
    .text(`Prepared for ${userName}`)
    .text(
      `${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)} • ${tasks.length} task${tasks.length === 1 ? "" : "s"}`,
    );

  document.moveDown(1);

  for (const [date, items] of groupedTasks.entries()) {
    ensurePdfSpace(document, 90);
    document
      .fontSize(15)
      .fillColor("#111827")
      .text(formatTaskGroupLabel(date));
    document
      .fontSize(10)
      .fillColor("#64748b")
      .text(
        `${items.length} task${items.length === 1 ? "" : "s"} • ${items.reduce(
          (total, task) => total + (task.storyPoint ?? 0),
          0,
        )} story points`,
      );
    document.moveDown(0.6);

    for (const task of items) {
      ensurePdfSpace(document, 120);
      const startY = document.y;
      document.rect(50, startY - 6, 495, 4).fill("#e2e8f0");
      document
        .fillColor("#0f172a")
        .fontSize(12)
        .text(`${task.ticketNumber} • ${task.ticketTitle}`, 50, startY + 10);
      document
        .fontSize(10)
        .fillColor("#475569")
        .text(
          `Status: ${task.status.replaceAll("_", " ")} • Story points: ${task.storyPoint ?? "—"} • Tags: ${
            task.tags.length ? task.tags.map(({ tag }) => tag.name).join(", ") : "None"
          }`,
        );

      if (task.ticketDescription) {
        document.text(`Description: ${task.ticketDescription}`);
      }

      document.text(
        task.dailyReport ? stripHtml(task.dailyReport) : "No daily report notes added.",
        {
          width: 495,
        },
      );
      document.moveDown(0.8);
    }
  }

  const pageRange = document.bufferedPageRange();
  for (let index = pageRange.start; index < pageRange.start + pageRange.count; index += 1) {
    document.switchToPage(index);
    document
      .fontSize(9)
      .fillColor("#64748b")
      .text(
        `Page ${index + 1} of ${pageRange.count}`,
        50,
        document.page.height - 40,
        {
          align: "center",
          width: document.page.width - 100,
        },
      );
  }

  document.flushPages();
  document.end();

  await new Promise<void>((resolve) => {
    document.on("end", () => resolve());
  });

  return Buffer.concat(chunks);
}

export function buildImportTemplateCsv() {
  return buildCsv({
    headers: TEMPLATE_HEADERS,
    rows: [
      [
        "2026-03-16",
        "APP-194",
        "Finish export workflow",
        "Build CSV, JSON, and PDF exports for task reports",
        5,
        "IN_PROGRESS",
        "reporting,phase-9",
        "Added export routes and polished the task workspace dialog flow.",
      ],
      [
        "2026-03-16",
        "OPS-88",
        "Prepare reminder cron route",
        "Create the reminder delivery endpoint and SMTP fallback",
        3,
        "TODO",
        "reminders,backend",
        "Mapped the cron email logic and listed the SMTP variables in env.",
      ],
    ],
  });
}

export function parseImportPreview({
  content,
  format,
  mapping,
}: {
  content: string;
  format: "csv" | "json";
  mapping?: Record<string, string>;
}) {
  if (format === "json") {
    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("JSON imports must be an array of task objects.");
    }

    const rows = parsed.map((entry) => {
      if (!entry || typeof entry !== "object") {
        return {};
      }

      const value = entry as Record<string, unknown>;
      return {
        date: value.date,
        ticketNumber: value.ticketNumber,
        ticketTitle: value.ticketTitle,
        ticketDescription: value.ticketDescription,
        storyPoint: value.storyPoint,
        status: value.status,
        tags: value.tags,
        dailyReport: value.dailyReport,
      };
    });

    return {
      detectedHeaders: Object.keys((parsed[0] as Record<string, unknown>) ?? {}),
      rows,
    };
  }

  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length) {
    throw new Error(parsed.errors[0]?.message ?? "Unable to parse CSV file.");
  }

  const detectedHeaders = parsed.meta.fields ?? [];
  const resolvedMapping = {
    ...resolveCsvMapping(detectedHeaders),
    ...mapping,
  };

  const rows = parsed.data.map((row) => ({
    date: getMappedValue(row, resolvedMapping, "date"),
    ticketNumber: getMappedValue(row, resolvedMapping, "ticketNumber"),
    ticketTitle: getMappedValue(row, resolvedMapping, "ticketTitle"),
    ticketDescription: getMappedValue(row, resolvedMapping, "ticketDescription"),
    storyPoint: getMappedValue(row, resolvedMapping, "storyPoint"),
    status: getMappedValue(row, resolvedMapping, "status"),
    tags: getMappedValue(row, resolvedMapping, "tags"),
    dailyReport: getMappedValue(row, resolvedMapping, "dailyReport"),
  }));

  return {
    detectedHeaders,
    mapping: resolvedMapping,
    rows,
  };
}

export async function importTasksForUser({
  userId,
  content,
  format,
  mapping,
  ipAddress,
}: {
  userId: string;
  content: string;
  format: "csv" | "json";
  mapping?: Record<string, string>;
  ipAddress?: string | null;
}) {
  const parsed = parseImportPreview({ content, format, mapping });
  const tasksToCreate: NormalizedImportTask[] = [];
  const errors: TaskImportError[] = [];

  parsed.rows.forEach((row, index) => {
    const result = normalizeImportTask(row, index + 2);
    if (result.task) {
      tasksToCreate.push(result.task);
    }
    errors.push(...result.errors);
  });

  if (!tasksToCreate.length) {
    return {
      imported: 0,
      skipped: parsed.rows.length,
      errors,
    };
  }

  const taggedNames = Array.from(
    new Set(tasksToCreate.flatMap((task) => task.tags).filter(Boolean)),
  );
  const tags = await ensureTags(taggedNames);
  const tagMap = new Map(tags.map((tag) => [tag.name, tag.id]));
  const now = new Date();

  const createdTasks = tasksToCreate.map((task) => ({
    id: crypto.randomUUID(),
    userId,
    date: new Date(`${task.date}T00:00:00.000Z`),
    ticketNumber: task.ticketNumber,
    ticketTitle: task.ticketTitle,
    ticketDescription: task.ticketDescription,
    storyPoint: task.storyPoint,
    dailyReport: task.dailyReport,
    status: task.status,
    createdAt: now,
    updatedAt: now,
  }));

  await db.$transaction(async (tx) => {
    await tx.task.createMany({
      data: createdTasks,
      skipDuplicates: false,
    });

    const taskTags = tasksToCreate.flatMap((task, index) =>
      task.tags
        .map((tagName) => tagMap.get(tagName))
        .filter((tagId): tagId is string => Boolean(tagId))
        .map((tagId) => ({
          taskId: createdTasks[index].id,
          tagId,
        })),
    );

    if (taskTags.length) {
      await tx.taskTag.createMany({
        data: taskTags,
        skipDuplicates: true,
      });
    }
  });

  await Promise.all(
    tasksToCreate.map((task, index) =>
      recordTaskHistory({
        action: TaskHistoryAction.CREATED,
        taskId: createdTasks[index].id,
        userId,
        changes: buildTaskHistoryDiff({
          before: {},
          after: buildTaskSnapshot({
            date: task.date,
            ticketNumber: task.ticketNumber,
            ticketTitle: task.ticketTitle,
            ticketDescription: task.ticketDescription,
            storyPoint: task.storyPoint,
            dailyReport: task.dailyReport,
            status: task.status,
            tags: task.tags,
          }),
        }),
      }),
    ),
  );

  await logActivity({
    action: "IMPORT_TASKS",
    userId,
    targetType: "task_import",
    ipAddress: ipAddress ?? null,
    metadata: {
      imported: tasksToCreate.length,
      skipped: errors.length,
      format,
    },
  });

  return {
    imported: tasksToCreate.length,
    skipped: parsed.rows.length - tasksToCreate.length,
    errors,
  };
}
