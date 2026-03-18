import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import authConfig from "@/auth.config";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { getIpFromHeaders } from "@/lib/request";
import { credentialsSchema } from "@/lib/validations/auth";
import { verifyPassword } from "@/lib/password";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials, request) {
        const parsedCredentials = credentialsSchema.safeParse(rawCredentials);
        const ipAddress = getIpFromHeaders(request.headers);

        if (!parsedCredentials.success) {
          await logActivity({
            action: "LOGIN_FAILED",
            ipAddress,
            metadata: { reason: "invalid_payload" },
          });

          return null;
        }

        const { email, password } = parsedCredentials.data;
        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user || !user.isActive) {
          await logActivity({
            action: "LOGIN_FAILED",
            userId: user?.id ?? null,
            ipAddress,
            metadata: {
              reason: user ? "inactive_user" : "user_not_found",
              email,
            },
          });

          return null;
        }

        const isPasswordValid = await verifyPassword(
          password,
          user.passwordHash,
        );

        if (!isPasswordValid) {
          await logActivity({
            action: "LOGIN_FAILED",
            userId: user.id,
            ipAddress,
            metadata: { reason: "invalid_password", email },
          });

          return null;
        }

        await logActivity({
          action: "LOGIN",
          userId: user.id,
          targetId: user.id,
          targetType: "user",
          ipAddress,
          metadata: { email },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
          theme: user.theme,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.avatarUrl = user.avatarUrl ?? null;
        token.theme = user.theme;
      }

      if (trigger === "update") {
        token.name = session.name ?? token.name;
        token.email = session.email ?? token.email;
        token.avatarUrl = session.avatarUrl ?? token.avatarUrl ?? null;
        token.theme = session.theme ?? token.theme ?? "SYSTEM";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.role = token.role ?? "USER";
        session.user.avatarUrl = token.avatarUrl ?? null;
        session.user.theme = token.theme ?? "SYSTEM";
      }

      return session;
    },
  },
  events: {
    async signOut(message) {
      const maybeToken = "token" in message ? message.token : null;
      const userId =
        typeof maybeToken?.sub === "string" ? maybeToken.sub : null;

      await logActivity({
        action: "LOGOUT",
        userId,
        targetId: userId,
        targetType: "user",
      });
    },
  },
});
