import { startOfDay } from "date-fns";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { sendReminderEmail } from "@/lib/email";
import { logActivity } from "@/lib/activity-log";
import { isWithinReminderWindow } from "@/lib/reminders";

function getDashboardUrl(request: NextRequest) {
  const configured =
    process.env.NEXTAUTH_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (configured) {
    return `${configured.replace(/\/$/, "")}/dashboard`;
  }

  return `${request.nextUrl.origin}/dashboard`;
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dashboardUrl = getDashboardUrl(request);

  const users = await db.user.findMany({
    where: {
      isActive: true,
      reminderEnabled: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      reminderTime: true,
    },
  });

  const dueUsers = users.filter((user) =>
    isWithinReminderWindow({
      reminderTime: user.reminderTime,
      now,
      windowMinutes: 15,
    }),
  );

  const [taskCounts, priorReminderLogs] = await Promise.all([
    dueUsers.length
      ? db.task.groupBy({
          by: ["userId"],
          where: {
            userId: {
              in: dueUsers.map((user) => user.id),
            },
            deletedAt: null,
            date: {
              gte: todayStart,
              lt: tomorrowStart,
            },
          },
          _count: {
            _all: true,
          },
        })
      : Promise.resolve([]),
    dueUsers.length
      ? db.activityLog.findMany({
          where: {
            action: "EMAIL_REMINDER_SENT",
            userId: {
              in: dueUsers.map((user) => user.id),
            },
            createdAt: {
              gte: todayStart,
              lt: tomorrowStart,
            },
          },
          select: {
            userId: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const taskCountMap = new Map(taskCounts.map((entry) => [entry.userId, entry._count._all]));
  const remindedUserIds = new Set(priorReminderLogs.map((entry) => entry.userId).filter(Boolean));
  const processed: Array<{ userId: string; delivered: boolean }> = [];

  for (const user of dueUsers) {
    if ((taskCountMap.get(user.id) ?? 0) > 0 || remindedUserIds.has(user.id)) {
      continue;
    }

    const emailResult = await sendReminderEmail({
      to: user.email,
      name: user.name,
      dashboardUrl,
    });

    await logActivity({
      action: "EMAIL_REMINDER_SENT",
      userId: user.id,
      targetId: user.id,
      targetType: "user",
      metadata: {
        delivered: emailResult.delivered,
        reminderTime: user.reminderTime,
      },
    });

    processed.push({
      userId: user.id,
      delivered: emailResult.delivered,
    });
  }

  return NextResponse.json({
    data: {
      processed: processed.length,
      delivered: processed.filter((entry) => entry.delivered).length,
    },
  });
}
