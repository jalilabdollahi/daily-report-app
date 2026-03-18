import { NextResponse } from "next/server";

import { auth } from "@/auth";

export async function requireApiUser() {
  const session = await auth();

  if (!session?.user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    user: session.user,
    response: null,
  };
}

export async function requireApiRole(role: "ADMIN" | "USER") {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  if (role === "ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export async function requireApiAdmin() {
  const { user, response } = await requireApiUser();

  if (response) {
    return {
      user: null,
      response,
    };
  }

  if (user.role !== "ADMIN") {
    return {
      user: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    user,
    response: null,
  };
}
