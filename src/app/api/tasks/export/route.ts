import { NextResponse, type NextRequest } from "next/server";

import { requireApiUser } from "@/lib/authz";
import {
  buildTaskExportCsv,
  buildTaskExportFilename,
  buildTaskExportJson,
  buildTaskExportPdf,
  getTasksForTransfer,
} from "@/lib/task-transfer";
import { taskExportQuerySchema } from "@/lib/validations/task";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  const params = request.nextUrl.searchParams;
  const parsedQuery = taskExportQuerySchema.safeParse({
    format: params.get("format") ?? undefined,
    startDate: params.get("startDate") ?? undefined,
    endDate: params.get("endDate") ?? undefined,
    status:
      params.getAll("status").length > 0
        ? params.getAll("status")
        : (params.get("status") ?? undefined),
    tags:
      params.getAll("tags").length > 0
        ? params.getAll("tags")
        : (params.get("tags") ?? undefined),
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues[0]?.message ?? "Invalid export query." },
      { status: 400 },
    );
  }

  const { endDate, format, startDate, status, tags } = parsedQuery.data;
  const tasks = await getTasksForTransfer({
    userId: user.id,
    startDate,
    endDate,
    status,
    tags,
  });

  const headers = {
    "Content-Disposition": `attachment; filename="${buildTaskExportFilename(format)}"`,
  };

  if (format === "csv") {
    return new NextResponse(buildTaskExportCsv(tasks), {
      headers: {
        ...headers,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  }

  if (format === "json") {
    return new NextResponse(buildTaskExportJson(tasks), {
      headers: {
        ...headers,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  }

  const pdfBuffer = await buildTaskExportPdf({
    tasks,
    userName: user.name,
    startDate,
    endDate,
  });

  return new NextResponse(pdfBuffer, {
    headers: {
      ...headers,
      "Content-Type": "application/pdf",
    },
  });
}
