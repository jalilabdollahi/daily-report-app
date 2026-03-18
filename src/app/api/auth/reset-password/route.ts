import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { hashPassword, hashToken } from "@/lib/password";
import { getRequestIp } from "@/lib/request";
import { resetPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIp(request);

  try {
    const body = await request.json();
    const parsedBody = resetPasswordSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const { password, token } = parsedBody.data;
    const hashedToken = hashToken(token);
    const user = await db.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "This reset token is invalid or has expired." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await logActivity({
      action: "PASSWORD_RESET_SUCCESS",
      userId: user.id,
      targetId: user.id,
      targetType: "user",
      ipAddress,
      metadata: { email: user.email },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password route failed", error);
    return NextResponse.json(
      { error: "Unable to reset your password right now." },
      { status: 500 },
    );
  }
}
