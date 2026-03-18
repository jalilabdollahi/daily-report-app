import {
  buildImportTemplateCsv,
  buildTaskExportCsv,
  buildTaskExportJson,
  parseImportPreview,
} from "@/lib/task-transfer";

const sampleTask = {
  id: "task-1",
  date: new Date("2026-03-16T00:00:00.000Z"),
  ticketNumber: "APP-101",
  ticketTitle: "Polish exports",
  ticketDescription: "Add CSV and PDF export support",
  storyPoint: 3,
  dailyReport: "<p>Completed the export workflow.</p>",
  status: "DONE" as const,
  createdAt: new Date("2026-03-16T08:00:00.000Z"),
  updatedAt: new Date("2026-03-16T09:00:00.000Z"),
  tags: [{ tag: { name: "phase-9", color: "#0f766e" } }],
};

describe("task transfer helpers", () => {
  it("builds csv rows with plain-text daily report content", () => {
    const csv = buildTaskExportCsv([sampleTask]);

    expect(csv).toContain("APP-101");
    expect(csv).toContain("Completed the export workflow.");
    expect(csv).not.toContain("<p>");
  });

  it("builds pretty-printed json", () => {
    const json = buildTaskExportJson([sampleTask]);

    expect(json).toContain('"ticketNumber": "APP-101"');
    expect(json).toContain('"tags": [');
  });

  it("returns a reusable import template", () => {
    const csv = buildImportTemplateCsv();

    expect(csv).toContain("Ticket Number");
    expect(csv).toContain("APP-194");
  });

  it("parses csv previews with flexible headers", () => {
    const preview = parseImportPreview({
      format: "csv",
      content:
        "Task Date,Ticket,Title,Description,Story Points,Status,Labels,Notes\n2026-03-16,APP-200,Test,Hello,2,DONE,alpha,beta",
    });

    expect(preview.rows[0]?.ticketNumber).toBe("APP-200");
    expect(preview.rows[0]?.dailyReport).toBe("beta");
  });

  it("rejects invalid json preview payloads", () => {
    expect(() =>
      parseImportPreview({
        format: "json",
        content: '{"ticketNumber":"APP-1"}',
      }),
    ).toThrow("JSON imports must be an array of task objects.");
  });
});
