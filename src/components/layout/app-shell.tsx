import type { ReactNode } from "react";
import { Menu } from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { NavItem, ShellVariant } from "@/types";

export function AppShell({
  children,
  items,
  subtitle,
  title,
  variant,
}: {
  children: ReactNode;
  items: NavItem[];
  subtitle: string;
  title: string;
  variant: ShellVariant;
}) {
  const mobileNav = (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon" variant="ghost" className="h-9 w-9">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="p-0 w-72">
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>
        <AppSidebar items={items} subtitle={subtitle} variant={variant} />
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <AppSidebar items={items} subtitle={subtitle} variant={variant} />
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <AppHeader mobileNav={mobileNav} title={title} variant={variant} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
