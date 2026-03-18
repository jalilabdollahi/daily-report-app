/** @vitest-environment node */

import { NextRequest } from "next/server";

import { GET } from "@/app/api/tasks/export/route";

vi.mock("@/lib/authz", () => ({
  requireApiUser: vi.fn(async () => ({
    user: {
      id: "user-1",
      name: "Export User",
    },
    response: null,
  })),
}));

vi.mock("@/lib/task-transfer", () => ({
  getTasksForTransfer: vi.fn(async () => []),
  buildTaskExportCsv: vi.fn(() => "csv-content"),
  buildTaskExportJson: vi.fn(() => "[]"),
  buildTaskExportPdf: vi.fn(async () => Buffer.from("pdf")),
  buildTaskExportFilename: vi.fn((format: string) => `daily-report.${format}`),
}));

describe("GET /api/tasks/export", () => {
  it("returns csv export responses", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/tasks/export?format=csv&startDate=2026-03-01&endDate=2026-03-16",
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
  });

  it("rejects invalid export requests", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/tasks/export?format=csv",
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
  });
});
