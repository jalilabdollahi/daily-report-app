import { NextResponse, type NextRequest } from "next/server";

import { requireApiAdmin } from "@/lib/authz";
import { createTemporaryPassword } from "@/lib/admin";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { hashPassword } from "@/lib/password";
import { getRequestIp } from "@/lib/request";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user: adminUser, response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const user = await db.user.findUnique({
    where: {
      id: params.id,
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const temporaryPassword = createTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  await db.user.update({
    where: { id: params.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  await logActivity({
    action: "ADMIN_RESET_PASSWORD",
    userId: adminUser.id,
    targetId: params.id,
    targetType: "user",
    ipAddress: getRequestIp(request),
    metadata: {
      email: user.email,
    },
  });

  return NextResponse.json({
    data: {
      temporaryPassword,
    },
  });
}
