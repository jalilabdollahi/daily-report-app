import Link from "next/link";
import { FileSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { NavItem, ShellVariant } from "@/types";

import { SidebarNav } from "./sidebar-nav";

export function AppSidebar({
  items,
  subtitle,
  variant,
}: {
  items: NavItem[];
  subtitle: string;
  variant: ShellVariant;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo area */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <FileSearch className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground">DailyReport</p>
            <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40">
              {variant === "admin" ? "Admin" : "Workspace"}
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav items={items} />
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        {variant === "admin" ? (
          <Button
            asChild
            className="w-full justify-start border-white/10 bg-white/5 text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground"
            variant="outline"
            size="sm"
          >
            <Link href="/dashboard">← Back to App</Link>
          </Button>
        ) : (
          <p className="px-2 text-[11px] leading-5 text-sidebar-foreground/40">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
