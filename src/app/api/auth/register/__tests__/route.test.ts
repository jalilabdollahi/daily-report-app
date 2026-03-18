/** @vitest-environment node */

import { NextRequest } from "next/server";

import { POST } from "@/app/api/auth/register/route";

const createRequest = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost:3000/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });

vi.mock("@/lib/request", () => ({
  getRequestIp: () => "127.0.0.1",
}));

vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: vi.fn(() => ({ success: true })),
}));

vi.mock("@/lib/app-config", () => ({
  getAppConfig: vi.fn(() => ({
    values: {
      registration_enabled: true,
      default_theme: "SYSTEM",
      default_reminder_time: "17:00",
    },
  })),
}));

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn(async () => "hashed-password"),
}));

vi.mock("@/lib/activity-log", () => ({
  logActivity: vi.fn(async () => undefined),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("POST /api/auth/register", () => {
  it("returns 409 for duplicate email addresses", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ id: "existing-user" });

    const response = await POST(
      createRequest({
        name: "Test User",
        email: "existing@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      }),
    );

    expect(response.status).toBe(409);
  });

  it("creates a user for valid registration input", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.user.findUnique).mockResolvedValueOnce(null);
    vi.mocked(db.user.create).mockResolvedValueOnce({
      id: "user-1",
      email: "new@example.com",
    });

    const response = await POST(
      createRequest({
        name: "New User",
        email: "new@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(db.user.create).toHaveBeenCalled();
  });
});
