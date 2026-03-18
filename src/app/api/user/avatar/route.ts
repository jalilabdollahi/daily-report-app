import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";
import { deleteAvatarFile, saveAvatarFile } from "@/lib/uploads";

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  try {
    const formData = await request.formData();
    const avatar = formData.get("avatar");

    if (!(avatar instanceof File)) {
      return NextResponse.json(
        { error: "Choose an avatar image to upload." },
        { status: 400 },
      );
    }

    const existingUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        avatarUrl: true,
      },
    });

    const avatarUrl = await saveAvatarFile(avatar);

    if (existingUser?.avatarUrl) {
      await deleteAvatarFile(existingUser.avatarUrl);
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        avatarUrl,
      },
    });

    return NextResponse.json({ data: { avatarUrl } });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to upload your avatar right now.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  try {
    const existingUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        avatarUrl: true,
      },
    });

    if (existingUser?.avatarUrl) {
      await deleteAvatarFile(existingUser.avatarUrl);
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: null,
      },
    });

    return NextResponse.json({ data: { avatarUrl: null } });
  } catch (error) {
    console.error("Delete avatar route failed", error);
    return NextResponse.json(
      { error: "Unable to remove your avatar right now." },
      { status: 500 },
    );
  }
}
