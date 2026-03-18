import { NextResponse, type NextRequest } from "next/server";

import { Theme } from "@prisma/client";

import { db } from "@/lib/db";
import { getAppConfig } from "@/lib/app-config";
import { logActivity } from "@/lib/activity-log";
import { hashPassword } from "@/lib/password";
import { getRequestIp } from "@/lib/request";
import { consumeRateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIp(request);
  const rateLimitResult = consumeRateLimit({
    key: `register:${ipAddress}`,
    limit: 3,
    windowMs: 60 * 1000,
  });

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error:
          "Too many registration attempts. Please wait a minute and try again.",
      },
      { status: 429 },
    );
  }

  try {
    const config = await getAppConfig();

    if (!config.values.registration_enabled) {
      return NextResponse.json(
        { error: "Registration is currently disabled." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsedBody = registerSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const { name, email, password } = parsedBody.data;
    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const defaultTheme = ["LIGHT", "DARK", "SYSTEM"].includes(
      config.values.default_theme,
    )
      ? (config.values.default_theme as Theme)
      : Theme.SYSTEM;

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        theme: defaultTheme,
        reminderTime: config.values.default_reminder_time,
      },
      select: {
        id: true,
        email: true,
      },
    });

    await logActivity({
      action: "REGISTER",
      userId: user.id,
      targetId: user.id,
      targetType: "user",
      ipAddress,
      metadata: { email: user.email },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Register route failed", error);
    return NextResponse.json(
      { error: "Unable to create account right now." },
      { status: 500 },
    );
  }
}
