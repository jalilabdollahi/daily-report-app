import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { dashboardNavItems } from "@/config/navigation";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      items={dashboardNavItems}
      subtitle="Capture your ticket work quickly, review progress by day, and keep the reporting habit lightweight."
      title="Daily report workspace"
      variant="dashboard"
    >
      {children}
    </AppShell>
  );
}
