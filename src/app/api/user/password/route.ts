import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";
import { logActivity } from "@/lib/activity-log";
import { getRequestIp } from "@/lib/request";
import { hashPassword, verifyPassword } from "@/lib/password";
import { updatePasswordSchema } from "@/lib/validations/user";

export async function PUT(request: NextRequest) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  try {
    const body = await request.json();
    const parsedBody = updatePasswordSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const isCurrentPasswordValid = await verifyPassword(
      parsedBody.data.currentPassword,
      currentUser.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Your current password is incorrect." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(parsedBody.data.newPassword);

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
      },
    });

    await logActivity({
      action: "PASSWORD_CHANGE",
      userId: user.id,
      targetId: user.id,
      targetType: "user",
      ipAddress: getRequestIp(request),
    });

    return NextResponse.json({
      message: "Password updated successfully.",
      forceSignOut: true,
    });
  } catch (error) {
    console.error("Update password route failed", error);
    return NextResponse.json(
      { error: "Unable to update your password right now." },
      { status: 500 },
    );
  }
}
