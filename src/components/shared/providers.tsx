"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";

import { KeyboardShortcuts } from "@/components/shared/keyboard-shortcuts";
import { ReminderManager } from "@/components/shared/reminder-manager";
import { SessionThemeSync } from "@/components/shared/session-theme-sync";
import { AppToaster } from "@/components/shared/sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";

export function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 60_000,
          },
        },
      }),
  );

  return (
    <ThemeProvider>
      <SessionProvider>
        <SessionThemeSync />
        <QueryClientProvider client={queryClient}>
          {children}
          <KeyboardShortcuts />
          <ReminderManager />
          <AppToaster />
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
