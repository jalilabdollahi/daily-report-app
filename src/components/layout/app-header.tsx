"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Plus, Shield } from "lucide-react";

import { TaskSearchForm } from "@/components/forms/task-search-form";
import { UserNav } from "@/components/layout/user-nav";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";

export function AppHeader({
  mobileNav,
  title,
  variant,
}: {
  mobileNav: ReactNode;
  title: string;
  variant: "dashboard" | "admin";
}) {
  const { user } = useCurrentUser();

  return (
    <header className="sticky top-0 z-20 border-b border-border/50 bg-background/90 backdrop-blur-md">
      <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="lg:hidden">{mobileNav}</div>

        {/* Search — grows to fill space */}
        <div className="hidden flex-1 lg:block xl:max-w-md">
          <TaskSearchForm />
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          {variant === "admin" ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="hidden gap-1.5 sm:inline-flex"
            >
              <Link href="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to app
              </Link>
            </Button>
          ) : (
            <>
              {user?.role === "ADMIN" ? (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="hidden gap-1.5 sm:inline-flex"
                >
                  <Link href="/admin">
                    <Shield className="h-3.5 w-3.5" />
                    Admin panel
                  </Link>
                </Button>
              ) : null}
              <Button
                asChild
                size="sm"
                className="hidden gap-1.5 sm:inline-flex"
              >
                <Link href="/dashboard/tasks/new">
                  <Plus className="h-3.5 w-3.5" />
                  New task
                </Link>
              </Button>
            </>
          )}
          <UserNav />
        </div>
      </div>
    </header>
  );
}
