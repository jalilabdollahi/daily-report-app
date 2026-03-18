import { redirect } from "next/navigation";

import { auth } from "@/auth";

export async function getCurrentUser() {
  const session = await auth();

  return session?.user ?? null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(role: "ADMIN" | "USER") {
  const user = await requireCurrentUser();

  if (role === "ADMIN" && user.role !== "ADMIN") {
    redirect("/forbidden");
  }

  return user;
}
