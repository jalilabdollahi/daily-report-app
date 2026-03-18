import { hash } from "bcryptjs";
import { PrismaClient, Role, Theme } from "@prisma/client";

import { defaultAppConfig } from "../src/lib/app-config";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.PRODUCTION_ADMIN_EMAIL;
  const adminPassword = process.env.PRODUCTION_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Set PRODUCTION_ADMIN_EMAIL and PRODUCTION_ADMIN_PASSWORD before running the production seed.",
    );
  }

  const passwordHash = await hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Production Admin",
      passwordHash,
      role: Role.ADMIN,
      theme: Theme.SYSTEM,
      isActive: true,
    },
    create: {
      name: "Production Admin",
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
      theme: Theme.SYSTEM,
      reminderEnabled: true,
      reminderTime: defaultAppConfig.default_reminder_time,
      isActive: true,
    },
  });

  await Promise.all(
    [
      { name: "Bug", color: "#ef4444" },
      { name: "Feature", color: "#0f766e" },
      { name: "Improvement", color: "#2563eb" },
      { name: "Urgent", color: "#f97316" },
    ].map((tag) =>
      prisma.tag.upsert({
        where: { name: tag.name },
        update: { color: tag.color },
        create: tag,
      }),
    ),
  );

  await Promise.all(
    Object.entries(defaultAppConfig).map(([key, value]) =>
      prisma.appConfig.upsert({
        where: { key },
        update: {
          value,
          updatedById: admin.id,
        },
        create: {
          key,
          value,
          updatedById: admin.id,
        },
      }),
    ),
  );

  console.info(
    `Production seed complete. Admin account ensured for ${adminEmail}. Change the password immediately after first login.`,
  );
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
