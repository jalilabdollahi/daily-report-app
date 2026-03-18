import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";
import { serializeUserProfile } from "@/lib/users";
import { updateProfileSchema } from "@/lib/validations/user";

export async function GET() {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      theme: true,
      reminderEnabled: true,
      reminderTime: true,
      role: true,
      createdAt: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ data: serializeUserProfile(profile) });
}

export async function PUT(request: NextRequest) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  try {
    const body = await request.json();
    const parsedBody = updateProfileSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const { email, name } = parsedBody.data;
    const existingUser = await db.user.findFirst({
      where: {
        email,
        id: {
          not: user.id,
        },
      },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "That email address is already in use." },
        { status: 409 },
      );
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        name,
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        theme: true,
        reminderEnabled: true,
        reminderTime: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: serializeUserProfile(updatedUser) });
  } catch (error) {
    console.error("Update profile route failed", error);
    return NextResponse.json(
      { error: "Unable to update your profile right now." },
      { status: 500 },
    );
  }
}
