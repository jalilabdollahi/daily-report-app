import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";
import { logActivity } from "@/lib/activity-log";
import { getRequestIp } from "@/lib/request";
import { deleteAvatarFile } from "@/lib/uploads";
import { deleteAccountSchema } from "@/lib/validations/user";

export async function DELETE(request: NextRequest) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  try {
    const body = await request.json();
    const parsedBody = deleteAccountSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    if (parsedBody.data.email !== user.email) {
      return NextResponse.json(
        { error: "Enter your email address to confirm account deletion." },
        { status: 400 },
      );
    }

    const existingUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        avatarUrl: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (existingUser.avatarUrl) {
      await deleteAvatarFile(existingUser.avatarUrl);
    }

    await db.user.delete({
      where: { id: existingUser.id },
    });

    await logActivity({
      action: "ACCOUNT_DELETE",
      targetId: existingUser.id,
      targetType: "user",
      ipAddress: getRequestIp(request),
      metadata: { email: existingUser.email },
    });

    return NextResponse.json({
      message: "Account deleted successfully.",
    });
  } catch (error) {
    console.error("Delete account route failed", error);
    return NextResponse.json(
      { error: "Unable to delete your account right now." },
      { status: 500 },
    );
  }
}
