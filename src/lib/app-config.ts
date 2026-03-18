import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export const defaultAppConfig = {
  registration_enabled: true,
  file_uploads_enabled: true,
  max_file_size_mb: 10,
  allowed_statuses: ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"],
  allowed_tags: [],
  default_theme: "SYSTEM",
  default_reminder_time: "17:00",
  rate_limit_login: 5,
  maintenance_mode: false,
} as const;

export type AppConfigKey = keyof typeof defaultAppConfig;
export type AppConfigShape = {
  registration_enabled: boolean;
  file_uploads_enabled: boolean;
  max_file_size_mb: number;
  allowed_statuses: string[];
  allowed_tags: string[];
  default_theme: string;
  default_reminder_time: string;
  rate_limit_login: number;
  maintenance_mode: boolean;
};

function normalizeAppConfigValue<K extends AppConfigKey>(
  key: K,
  value: unknown,
): AppConfigShape[K] {
  const fallback = defaultAppConfig[key];

  if (key === "allowed_statuses" || key === "allowed_tags") {
    if (Array.isArray(value)) {
      return value.map(String) as AppConfigShape[K];
    }

    return [...(fallback as readonly string[])] as AppConfigShape[K];
  }

  if (typeof fallback === "boolean") {
    return Boolean(value) as AppConfigShape[K];
  }

  if (typeof fallback === "number") {
    const nextValue = Number(value);
    return (
      Number.isFinite(nextValue) ? nextValue : fallback
    ) as AppConfigShape[K];
  }

  return (typeof value === "string" ? value : fallback) as AppConfigShape[K];
}

export async function getAppConfig() {
  const rows = await db.appConfig.findMany({
    include: {
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const values: AppConfigShape = {
    registration_enabled: defaultAppConfig.registration_enabled,
    file_uploads_enabled: defaultAppConfig.file_uploads_enabled,
    max_file_size_mb: defaultAppConfig.max_file_size_mb,
    allowed_statuses: [...defaultAppConfig.allowed_statuses],
    allowed_tags: [...defaultAppConfig.allowed_tags],
    default_theme: defaultAppConfig.default_theme,
    default_reminder_time: defaultAppConfig.default_reminder_time,
    rate_limit_login: defaultAppConfig.rate_limit_login,
    maintenance_mode: defaultAppConfig.maintenance_mode,
  };
  const mutableValues = values as Record<
    AppConfigKey,
    string | number | boolean | string[]
  >;
  let lastUpdatedAt: string | null = null;
  let lastUpdatedBy: { id: string; name: string; email: string } | null = null;

  for (const row of rows) {
    const key = row.key as AppConfigKey;

    if (!(key in defaultAppConfig)) {
      continue;
    }

    mutableValues[key] = normalizeAppConfigValue(key, row.value);

    if (!lastUpdatedAt || row.updatedAt > new Date(lastUpdatedAt)) {
      lastUpdatedAt = row.updatedAt.toISOString();
      lastUpdatedBy = row.updatedBy
        ? {
            id: row.updatedBy.id,
            name: row.updatedBy.name,
            email: row.updatedBy.email,
          }
        : null;
    }
  }

  return {
    values,
    lastUpdatedAt,
    lastUpdatedBy,
  };
}

export async function getAppConfigValue<K extends AppConfigKey>(key: K) {
  const row = await db.appConfig.findUnique({
    where: { key },
  });

  return row
    ? normalizeAppConfigValue(key, row.value)
    : normalizeAppConfigValue(key, defaultAppConfig[key]);
}

export async function updateAppConfig(
  values: Partial<AppConfigShape>,
  userId: string,
) {
  const entries = Object.entries(values) as Array<[AppConfigKey, unknown]>;

  await db.$transaction(
    entries.map(([key, value]) =>
      db.appConfig.upsert({
        where: { key },
        update: {
          value: value as Prisma.InputJsonValue,
          updatedById: userId,
        },
        create: {
          key,
          value: value as Prisma.InputJsonValue,
          updatedById: userId,
        },
      }),
    ),
  );

  return getAppConfig();
}
