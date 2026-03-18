import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";

export async function GET() {
  const { response } = await requireApiUser();

  if (response) {
    return response;
  }

  const announcements = await db.announcement.findMany({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      message: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    data: announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      createdAt: announcement.createdAt.toISOString(),
    })),
  });
}
