"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  CheckSquare,
  FileText,
  LayoutDashboard,
  Megaphone,
  ScrollText,
  Settings,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";

const iconMap = {
  activity: Activity,
  bell: Bell,
  "check-square": CheckSquare,
  "file-text": FileText,
  "layout-dashboard": LayoutDashboard,
  megaphone: Megaphone,
  "scroll-text": ScrollText,
  settings: Settings,
  "shield-check": ShieldCheck,
  tags: Tags,
  users: Users,
} as const;

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const Icon = iconMap[item.icon as keyof typeof iconMap];
        const isActive =
          item.href === "/dashboard"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={`${item.href}-${item.title}`}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
              isActive
                ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
            href={item.href}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-white/15 text-white"
                  : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate">{item.title}</span>
            {isActive && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
