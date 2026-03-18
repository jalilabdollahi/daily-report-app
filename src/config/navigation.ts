import type { NavItem } from "@/types";

export const dashboardNavItems: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: "layout-dashboard",
    description: "Landing page and quick stats.",
  },
  {
    title: "Tasks",
    href: "/dashboard/tasks",
    icon: "check-square",
    description: "Create, review, and edit daily task reports.",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: "settings",
    description: "Profile and preferences shell.",
  },
];

export const adminNavItems: NavItem[] = [
  {
    title: "Overview",
    href: "/admin",
    icon: "layout-dashboard",
    description: "System-wide metrics and recent activity.",
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: "users",
    description: "Search, manage, and audit user accounts.",
  },
  {
    title: "Activity Logs",
    href: "/admin/activity",
    icon: "scroll-text",
    description: "Track authentication and task events.",
  },
  {
    title: "Content",
    href: "/admin/content",
    icon: "file-text",
    description: "Moderate tasks across the whole app.",
  },
  {
    title: "Configuration",
    href: "/admin/config",
    icon: "settings",
    description: "Manage platform defaults and limits.",
  },
  {
    title: "System Health",
    href: "/admin/health",
    icon: "activity",
    description: "Check database, storage, and uptime.",
  },
  {
    title: "Announcements",
    href: "/admin/announcements",
    icon: "megaphone",
    description: "Publish and manage user-facing notices.",
  },
];
