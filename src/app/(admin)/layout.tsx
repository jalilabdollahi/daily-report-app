import type { ReactNode } from "react";

import { RequireRole } from "@/components/shared/require-role";
import { AdminShell } from "@/components/layout/admin-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="ADMIN">
      <AdminShell>{children}</AdminShell>
    </RequireRole>
  );
}
