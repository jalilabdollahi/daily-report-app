import type { ReactNode } from "react";

import { adminNavItems } from "@/config/navigation";

import { AppShell } from "./app-shell";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AppShell
      items={adminNavItems}
      subtitle="System analytics, moderation, and user oversight live in this admin-specific shell."
      title="Admin dashboard"
      variant="admin"
    >
      {children}
    </AppShell>
  );
}
