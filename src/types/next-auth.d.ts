import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: "ADMIN" | "USER";
      avatarUrl?: string | null;
      theme: "LIGHT" | "DARK" | "SYSTEM";
    };
  }

  interface User {
    id: string;
    role: "ADMIN" | "USER";
    avatarUrl?: string | null;
    theme: "LIGHT" | "DARK" | "SYSTEM";
    isActive?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "ADMIN" | "USER";
    avatarUrl?: string | null;
    theme?: "LIGHT" | "DARK" | "SYSTEM";
  }
}
