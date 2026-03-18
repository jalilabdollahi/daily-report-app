import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/authz";
import { createTagSchema } from "@/lib/validations/task";
import { getTagColor } from "@/lib/tasks";

export async function GET() {
  const { response } = await requireApiUser();

  if (response) {
    return response;
  }

  const tags = await db.tag.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
    },
  });

  return NextResponse.json({ data: tags });
}

export async function POST(request: NextRequest) {
  const { response } = await requireApiUser();

  if (response) {
    return response;
  }

  try {
    const body = await request.json();
    const parsedBody = createTagSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const { color, name } = parsedBody.data;
    const tag = await db.tag.upsert({
      where: { name },
      update: {},
      create: {
        name,
        color: color ?? getTagColor(name),
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });

    return NextResponse.json({ data: tag });
  } catch (error) {
    console.error("Tags route failed", error);
    return NextResponse.json(
      { error: "Unable to create tag right now." },
      { status: 500 },
    );
  }
}
