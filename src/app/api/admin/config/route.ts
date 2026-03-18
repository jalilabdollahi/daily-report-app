import { NextResponse, type NextRequest } from "next/server";

import { requireApiAdmin } from "@/lib/authz";
import { getAppConfig, updateAppConfig } from "@/lib/app-config";
import { logActivity } from "@/lib/activity-log";
import { getRequestIp } from "@/lib/request";
import { appConfigUpdateSchema } from "@/lib/validations/admin";

export async function GET() {
  const { response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  return NextResponse.json({
    data: await getAppConfig(),
  });
}

export async function PUT(request: NextRequest) {
  const { user, response } = await requireApiAdmin();

  if (response) {
    return response;
  }

  const body = await request.json();
  const parsedBody = appConfigUpdateSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const config = await updateAppConfig(parsedBody.data, user.id);

  await logActivity({
    action: "ADMIN_UPDATE_CONFIG",
    userId: user.id,
    targetType: "app_config",
    ipAddress: getRequestIp(request),
    metadata: parsedBody.data,
  });

  return NextResponse.json({
    data: config,
  });
}
