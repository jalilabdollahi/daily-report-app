import type { User } from "@prisma/client";

import type { UserProfile } from "@/types/user";

export function serializeUserProfile(
  user: Pick<
    User,
    | "id"
    | "name"
    | "email"
    | "avatarUrl"
    | "theme"
    | "reminderEnabled"
    | "reminderTime"
    | "role"
    | "createdAt"
  >,
): UserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    theme: user.theme,
    reminderEnabled: user.reminderEnabled,
    reminderTime: user.reminderTime,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
