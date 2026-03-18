import { NextResponse } from "next/server";

import { buildImportTemplateCsv } from "@/lib/task-transfer";

export async function GET() {
  return new NextResponse(buildImportTemplateCsv(), {
    headers: {
      "Content-Disposition": 'attachment; filename="daily-report-template.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
