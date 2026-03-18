import type { NextAuthConfig } from "next-auth";

const authConfig = {
  providers: [],
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: Number(process.env.AUTH_SESSION_MAX_AGE ?? 60 * 60 * 24 * 7),
  },
} satisfies NextAuthConfig;

export default authConfig;
