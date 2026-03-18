import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import authConfig from "@/auth.config";
import { getIpFromHeaders } from "@/lib/request";
import { consumeRateLimit } from "@/lib/rate-limit";

const authPagePaths = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];
const protectedUserPaths = ["/dashboard", "/reports", "/history", "/settings"];
const protectedAdminPaths = ["/admin"];

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;
  const ipAddress = getIpFromHeaders(request.headers);

  if (
    pathname === "/api/auth/callback/credentials" &&
    request.method === "POST"
  ) {
    const rateLimitResult = consumeRateLimit({
      key: `login:${ipAddress}`,
      limit: 5,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again in a minute." },
        { status: 429 },
      );
    }
  }

  if (pathname === "/api/tasks" && request.method === "POST") {
    const rateLimitResult = consumeRateLimit({
      key: `task-create:${request.auth?.user?.id ?? ipAddress}`,
      limit: 20,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many task creation requests. Try again in a minute." },
        { status: 429 },
      );
    }
  }

  if (
    pathname.startsWith("/api/tasks/") &&
    pathname.endsWith("/attachments") &&
    request.method === "POST"
  ) {
    const rateLimitResult = consumeRateLimit({
      key: `attachment-upload:${request.auth?.user?.id ?? ipAddress}`,
      limit: 10,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many upload requests. Try again later." },
        { status: 429 },
      );
    }
  }

  if (pathname.startsWith("/api/admin")) {
    const rateLimitResult = consumeRateLimit({
      key: `admin-api:${request.auth?.user?.id ?? ipAddress}`,
      limit: 120,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many admin requests. Try again in a minute." },
        { status: 429 },
      );
    }
  }

  const isAuthenticated = Boolean(request.auth?.user);
  const isAuthPage = authPagePaths.some(
    (authPath) => pathname === authPath || pathname.startsWith(`${authPath}/`),
  );
  const isProtectedUserRoute = protectedUserPaths.some(
    (protectedPath) =>
      pathname === protectedPath || pathname.startsWith(`${protectedPath}/`),
  );
  const isProtectedAdminRoute = protectedAdminPaths.some(
    (protectedPath) =>
      pathname === protectedPath || pathname.startsWith(`${protectedPath}/`),
  );

  if (isAuthPage && isAuthenticated) {
    const destination =
      request.auth?.user.role === "ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(destination, nextUrl));
  }

  if (!isAuthenticated && (isProtectedUserRoute || isProtectedAdminRoute)) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedAdminRoute && request.auth?.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/forbidden", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/reports/:path*",
    "/history/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/forbidden",
    "/api/auth/callback/credentials",
    "/api/tasks",
    "/api/tasks/import",
    "/api/tasks/:path*/attachments",
    "/api/admin/:path*",
  ],
};
