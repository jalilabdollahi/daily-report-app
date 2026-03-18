import { NextResponse, type NextRequest } from "next/server";

import { requireApiUser } from "@/lib/authz";
import { getRequestIp } from "@/lib/request";
import { importTasksForUser } from "@/lib/task-transfer";
import { taskImportMappingSchema } from "@/lib/validations/task";

function inferImportFormat(fileName: string) {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith(".json")) {
    return "json" as const;
  }

  return "csv" as const;
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireApiUser();

  if (response) {
    return response;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const mappingValue = formData.get("mapping");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a CSV or JSON file." }, { status: 400 });
    }

    const content = await file.text();
    const mapping =
      typeof mappingValue === "string" && mappingValue.trim()
        ? taskImportMappingSchema.parse(JSON.parse(mappingValue))
        : undefined;

    const result = await importTasksForUser({
      userId: user.id,
      content,
      format: inferImportFormat(file.name),
      mapping,
      ipAddress: getRequestIp(request),
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Task import failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to import tasks right now." },
      { status: 500 },
    );
  }
}
