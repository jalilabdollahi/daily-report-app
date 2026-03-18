export type ThemePreference = "LIGHT" | "DARK" | "SYSTEM";
export type UserRole = "ADMIN" | "USER";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  theme: ThemePreference;
  reminderEnabled: boolean;
  reminderTime: string;
  role: UserRole;
  createdAt: string;
};
