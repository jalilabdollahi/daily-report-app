import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";
import { updatePreferencesSchema } from "@/lib/validations/user";

export async function PUT(request: NextRequest) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  try {
    const body = await request.json();
    const parsedBody = updatePreferencesSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        theme: parsedBody.data.theme,
        reminderEnabled: parsedBody.data.reminderEnabled,
        reminderTime: parsedBody.data.reminderTime,
      },
      select: {
        theme: true,
        reminderEnabled: true,
        reminderTime: true,
      },
    });

    return NextResponse.json({ data: updatedUser });
  } catch (error) {
    console.error("Update preferences route failed", error);
    return NextResponse.json(
      { error: "Unable to update your preferences right now." },
      { status: 500 },
    );
  }
}
