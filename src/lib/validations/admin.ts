import { z } from "zod";

const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");

export const adminPaginationSchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortOrder: sortOrderSchema,
});

export const adminUsersQuerySchema = adminPaginationSchema.extend({
  sortBy: z
    .enum([
      "name",
      "email",
      "role",
      "status",
      "task_count",
      "created_at",
      "last_login",
    ])
    .default("created_at"),
  role: z.enum(["ADMIN", "USER"]).optional(),
  is_active: z.enum(["true", "false"]).optional(),
});

export const adminUserUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  role: z.enum(["ADMIN", "USER"]),
});

export const adminUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const adminActivityQuerySchema = adminPaginationSchema.extend({
  action: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const adminTasksQuerySchema = adminPaginationSchema.extend({
  sortBy: z
    .enum([
      "date",
      "created_at",
      "story_point",
      "ticket_number",
      "ticket_title",
      "user_name",
    ])
    .default("date"),
  userId: z.string().uuid().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]).optional(),
  flagged: z.enum(["all", "true", "false"]).default("all"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const adminTaskFlagSchema = z.object({
  flagged: z.boolean(),
});

export const appConfigUpdateSchema = z.object({
  registration_enabled: z.boolean(),
  file_uploads_enabled: z.boolean(),
  max_file_size_mb: z.number().min(1).max(100),
  allowed_statuses: z.array(z.string().trim().min(1)).min(1),
  allowed_tags: z.array(z.string().trim().min(1)),
  default_theme: z.enum(["LIGHT", "DARK", "SYSTEM"]),
  default_reminder_time: z.string().regex(/^\d{2}:\d{2}$/),
  rate_limit_login: z.number().int().min(1).max(100),
  maintenance_mode: z.boolean(),
});

export const adminAnnouncementsQuerySchema = adminPaginationSchema.extend({
  status: z.enum(["all", "active", "inactive"]).default("all"),
});

export const adminAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(5000),
  expiresAt: z.string().datetime().nullable().optional(),
});
