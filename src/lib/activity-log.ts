import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type ActivityLogInput = {
  action: string;
  userId?: string | null;
  targetId?: string | null;
  targetType?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
};

export async function logActivity({
  action,
  userId,
  targetId,
  targetType,
  metadata,
  ipAddress,
}: ActivityLogInput) {
  try {
    await db.activityLog.create({
      data: {
        action,
        userId: userId ?? null,
        targetId: targetId ?? null,
        targetType: targetType ?? null,
        metadata: metadata ?? undefined,
        ipAddress: ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to write activity log", error);
  }
}
