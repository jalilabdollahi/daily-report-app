import { z } from "zod";

export const taskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "BLOCKED",
]);

export const taskTagNamesSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(12)
  .transform((values) =>
    Array.from(new Set(values.map((value) => value.trim()))),
  );

export const createTaskSchema = z.object({
  date: z.string().date("Enter a valid task date."),
  ticketNumber: z.string().trim().min(1, "Ticket number is required."),
  ticketTitle: z
    .string()
    .trim()
    .min(1, "Ticket title is required.")
    .max(200, "Ticket title must be 200 characters or fewer."),
  ticketDescription: z
    .string()
    .trim()
    .max(5000, "Ticket description must be 5000 characters or fewer.")
    .optional()
    .default(""),
  storyPoint: z
    .number()
    .min(0, "Story point must be between 0 and 100.")
    .max(100, "Story point must be between 0 and 100.")
    .nullable()
    .optional(),
  dailyReport: z
    .string()
    .trim()
    .max(50000, "Daily report must be 50000 characters or fewer.")
    .optional()
    .default(""),
  status: taskStatusSchema.optional().default("TODO"),
  tags: taskTagNamesSchema.optional().default([]),
});

export const updateTaskSchema = createTaskSchema.partial();

const queryArraySchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => String(entry).split(","))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}, z.array(z.string()));

export const taskSortFieldSchema = z.enum([
  "date",
  "created_at",
  "story_point",
  "ticket_number",
  "ticket_title",
]);

export const taskSortOrderSchema = z.enum(["asc", "desc"]);

export const taskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  date: z.string().date().optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  search: z.string().trim().max(200).optional().default(""),
  status: queryArraySchema.pipe(z.array(taskStatusSchema)).default([]),
  tags: queryArraySchema.pipe(taskTagNamesSchema).default([]),
  sortBy: taskSortFieldSchema.default("date"),
  sortOrder: taskSortOrderSchema.default("desc"),
});

export const taskExportQuerySchema = z.object({
  format: z.enum(["csv", "json", "pdf"]),
  startDate: z.string().date("Start date is required."),
  endDate: z.string().date("End date is required."),
  status: queryArraySchema.pipe(z.array(taskStatusSchema)).default([]),
  tags: queryArraySchema.pipe(taskTagNamesSchema).default([]),
});

export const taskImportMappingSchema = z
  .object({
    date: z.string().optional(),
    ticketNumber: z.string().optional(),
    ticketTitle: z.string().optional(),
    ticketDescription: z.string().optional(),
    storyPoint: z.string().optional(),
    status: z.string().optional(),
    tags: z.string().optional(),
    dailyReport: z.string().optional(),
  })
  .partial();

export const taskTagsSchema = z.object({
  tags: taskTagNamesSchema,
});

export const bulkTaskIdsSchema = z
  .array(z.string().uuid("Task id is invalid."))
  .min(1, "Select at least one task.")
  .max(100, "Bulk actions are limited to 100 tasks.");

export const bulkDeleteTasksSchema = z.object({
  taskIds: bulkTaskIdsSchema,
});

export const bulkStatusTasksSchema = z.object({
  taskIds: bulkTaskIdsSchema,
  status: taskStatusSchema,
});

export const createTagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required.").max(40),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, "Color must be a valid hex value.")
    .optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQueryInput = z.infer<typeof taskQuerySchema>;
export type TaskExportQueryInput = z.infer<typeof taskExportQuerySchema>;
export type TaskTagsInput = z.infer<typeof taskTagsSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type BulkDeleteTasksInput = z.infer<typeof bulkDeleteTasksSchema>;
export type BulkStatusTasksInput = z.infer<typeof bulkStatusTasksSchema>;
export type TaskImportMappingInput = z.infer<typeof taskImportMappingSchema>;
