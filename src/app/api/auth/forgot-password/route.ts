import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { createPasswordResetToken } from "@/lib/password";
import { getRequestIp } from "@/lib/request";
import { consumeRateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIp(request);
  const rateLimitResult = consumeRateLimit({
    key: `forgot-password:${ipAddress}`,
    limit: 3,
    windowMs: 60 * 1000,
  });

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error:
          "Too many password reset requests. Please wait a minute and try again.",
      },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const parsedBody = forgotPasswordSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const { email } = parsedBody.data;
    const user = await db.user.findUnique({
      where: { email },
    });

    if (user) {
      const { rawToken, hashedToken, expiresAt } = createPasswordResetToken();

      await db.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: hashedToken,
          passwordResetExpires: expiresAt,
        },
      });

      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;

      console.log(`[password-reset] ${email}: ${resetLink}`);

      await logActivity({
        action: "PASSWORD_RESET_REQUEST",
        userId: user.id,
        targetId: user.id,
        targetType: "user",
        ipAddress,
        metadata: { email },
      });
    } else {
      await logActivity({
        action: "PASSWORD_RESET_REQUEST",
        ipAddress,
        metadata: { email, userFound: false },
      });
    }

    return NextResponse.json({
      message: "If an account with that email exists, we've sent a reset link.",
    });
  } catch (error) {
    console.error("Forgot password route failed", error);
    return NextResponse.json(
      { error: "Unable to process your request right now." },
      { status: 500 },
    );
  }
}
