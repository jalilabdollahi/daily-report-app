import type { NextRequest } from "next/server";

export function getIpFromHeaders(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return realIp ?? "unknown";
}

export function getRequestIp(request: NextRequest) {
  return getIpFromHeaders(request.headers);
}
