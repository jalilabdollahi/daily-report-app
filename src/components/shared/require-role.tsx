import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth-helpers";

export async function RequireRole({
  children,
  role,
}: {
  children: ReactNode;
  role: "ADMIN" | "USER";
}) {
  await requireRole(role);

  return <>{children}</>;
}
