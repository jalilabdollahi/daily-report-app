import { randomBytes } from "crypto";
import path from "path";
import { stat } from "fs/promises";

import { db } from "@/lib/db";

export function clampPage(value: number, fallback = 1) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * limit;

  return {
    data: items.slice(startIndex, startIndex + limit),
    total,
    page: safePage,
    limit,
    totalPages,
  };
}

export async function getTotalAttachmentBytes() {
  const result = await db.attachment.aggregate({
    _sum: {
      fileSize: true,
    },
  });

  return result._sum.fileSize ?? 0;
}

export async function getAvatarStorageBytes() {
  const users = await db.user.findMany({
    where: {
      avatarUrl: {
        not: null,
      },
    },
    select: {
      avatarUrl: true,
    },
  });

  let total = 0;

  for (const user of users) {
    if (!user.avatarUrl) {
      continue;
    }

    try {
      const filePath = path.join(process.cwd(), "public", user.avatarUrl);
      const fileStats = await stat(filePath);
      total += fileStats.size;
    } catch {
      continue;
    }
  }

  return total;
}

export async function getTotalStorageBytes() {
  const [attachmentBytes, avatarBytes] = await Promise.all([
    getTotalAttachmentBytes(),
    getAvatarStorageBytes(),
  ]);

  return attachmentBytes + avatarBytes;
}

export function createTemporaryPassword() {
  return randomBytes(6).toString("base64url");
}
