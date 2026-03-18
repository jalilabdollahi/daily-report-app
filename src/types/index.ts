export type NavItem = {
  title: string;
  href: string;
  icon: string;
  description?: string;
};

export type ShellVariant = "dashboard" | "admin";

export type StatCardData = {
  label: string;
  value: string;
  helper: string;
};
