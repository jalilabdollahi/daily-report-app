import { hash } from "bcryptjs";

import {
  PrismaClient,
  Role,
  TaskHistoryAction,
  TaskStatus,
  Theme,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await hash("admin123", 12);
  const userPassword = await hash("user123", 12);

  await prisma.taskTag.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.taskHistory.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.appConfig.deleteMany();
  await prisma.task.deleteMany();
  await prisma.tag.deleteMany();

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      name: "Admin User",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      theme: Theme.SYSTEM,
    },
    create: {
      name: "Admin User",
      email: "admin@example.com",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      theme: Theme.SYSTEM,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {
      name: "Daily Reporter",
      passwordHash: userPassword,
      role: Role.USER,
      theme: Theme.LIGHT,
    },
    create: {
      name: "Daily Reporter",
      email: "user@example.com",
      passwordHash: userPassword,
      role: Role.USER,
      theme: Theme.LIGHT,
    },
  });

  const tags = await Promise.all(
    [
      { name: "Bug", color: "#ef4444" },
      { name: "Feature", color: "#0f766e" },
      { name: "Improvement", color: "#2563eb" },
      { name: "Urgent", color: "#f97316" },
    ].map((tag) =>
      prisma.tag.create({
        data: tag,
      }),
    ),
  );

  const [bugTag, featureTag, improvementTag, urgentTag] = tags;

  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        userId: user.id,
        date: new Date("2026-03-16T09:00:00.000Z"),
        ticketNumber: "OPS-2418",
        ticketTitle: "Stabilize nightly backup verification",
        ticketDescription:
          "Investigated intermittent failures in the nightly PostgreSQL backup verification job.",
        storyPoint: 3,
        dailyReport:
          "<p>Reproduced the verification failure, reviewed the retention policy, and documented the fix path for the platform team.</p>",
        status: TaskStatus.IN_PROGRESS,
        flagged: true,
        tags: {
          create: [{ tagId: bugTag.id }, { tagId: urgentTag.id }],
        },
        history: {
          create: {
            userId: user.id,
            action: TaskHistoryAction.CREATED,
            changes: {
              status: TaskStatus.IN_PROGRESS,
              ticketNumber: "OPS-2418",
            },
          },
        },
      },
    }),
    prisma.task.create({
      data: {
        userId: user.id,
        date: new Date("2026-03-15T09:00:00.000Z"),
        ticketNumber: "APP-1192",
        ticketTitle: "Prepare daily report dashboard wireframe",
        ticketDescription:
          "Outlined a lightweight reporting flow for faster task logging across desktop and mobile.",
        storyPoint: 5,
        dailyReport:
          "<p>Mapped the key dashboard states, proposed a quick-add entry point, and reviewed spacing with the design system constraints.</p>",
        status: TaskStatus.DONE,
        tags: {
          create: [{ tagId: featureTag.id }, { tagId: improvementTag.id }],
        },
        history: {
          create: {
            userId: user.id,
            action: TaskHistoryAction.CREATED,
            changes: {
              status: TaskStatus.DONE,
              ticketNumber: "APP-1192",
            },
          },
        },
      },
    }),
  ]);

  await prisma.announcement.create({
    data: {
      adminId: admin.id,
      title: "Welcome to Daily Report App",
      message:
        "Seed data is ready. You can now explore authentication, task management, and reporting flows.",
      isActive: true,
      expiresAt: new Date("2026-04-01T00:00:00.000Z"),
    },
  });

  await prisma.activityLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "LOGIN",
        targetId: admin.id,
        targetType: "user",
        metadata: { source: "seed" },
        ipAddress: "127.0.0.1",
      },
      {
        userId: user.id,
        action: "CREATE_TASK",
        targetId: tasks[0].id,
        targetType: "task",
        metadata: { ticketNumber: tasks[0].ticketNumber },
        ipAddress: "127.0.0.1",
      },
    ],
  });

  await prisma.appConfig.createMany({
    data: [
      { key: "registration_enabled", value: true, updatedById: admin.id },
      { key: "file_uploads_enabled", value: true, updatedById: admin.id },
      { key: "max_file_size_mb", value: 10, updatedById: admin.id },
      {
        key: "allowed_statuses",
        value: ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"],
        updatedById: admin.id,
      },
      { key: "allowed_tags", value: [], updatedById: admin.id },
      { key: "default_theme", value: "SYSTEM", updatedById: admin.id },
      { key: "default_reminder_time", value: "17:00", updatedById: admin.id },
      { key: "rate_limit_login", value: 5, updatedById: admin.id },
      { key: "maintenance_mode", value: false, updatedById: admin.id },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
