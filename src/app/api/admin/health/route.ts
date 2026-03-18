import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { subDays } from "date-fns";

import { requireApiAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { getTotalStorageBytes } from "@/lib/admin";

export async function GET() {
  const { response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const dbStart = performance.now();
  await db.$queryRaw`SELECT 1`;
  const dbResponseTimeMs = Math.round(performance.now() - dbStart);

  let databaseSizeBytes: number | null = null;
  try {
    const result = await db.$queryRaw<Array<{ size: bigint | number }>>`
      SELECT pg_database_size(current_database()) AS size
    `;

    const rawSize = result[0]?.size;
    databaseSizeBytes =
      typeof rawSize === "bigint" ? Number(rawSize) : Number(rawSize ?? 0);
  } catch {
    databaseSizeBytes = null;
  }

  const [storageUsedBytes, activeSessions, packageJsonRaw] = await Promise.all([
    getTotalStorageBytes(),
    db.activityLog
      .groupBy({
        by: ["userId"],
        where: {
          userId: {
            not: null,
          },
          action: "LOGIN",
          createdAt: {
            gte: subDays(new Date(), 1),
          },
        },
      })
      .then((rows) => rows.length),
    readFile(path.join(process.cwd(), "package.json"), "utf8"),
  ]);

  const packageJson = JSON.parse(packageJsonRaw) as {
    dependencies?: Record<string, string>;
  };

  return NextResponse.json({
    data: {
      database: {
        status: dbResponseTimeMs < 500 ? "healthy" : "degraded",
        responseTimeMs: dbResponseTimeMs,
        sizeBytes: databaseSizeBytes,
      },
      api: {
        status: dbResponseTimeMs < 500 ? "healthy" : "degraded",
        avgResponseTimeMs: dbResponseTimeMs,
      },
      storageUsedBytes,
      activeSessions,
      uptimeSeconds: Math.round(process.uptime()),
      environment: process.env.NODE_ENV ?? "development",
      nodeVersion: process.version,
      nextVersion: packageJson.dependencies?.next ?? "unknown",
      lastDeploymentAt: process.env.LAST_DEPLOYED_AT ?? null,
      recentErrors: [],
    },
  });
}
