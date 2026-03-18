"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <main
          className="flex min-h-screen items-center justify-center px-4 py-12"
          id="main-content"
        >
          <Card className="w-full max-w-2xl border-destructive/20 bg-white/90 shadow-soft">
            <CardHeader className="space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.25em] text-destructive">
                  Server error
                </p>
                <CardTitle className="text-3xl">
                  Something went wrong on our side.
                </CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">
                  Try the action again. If the issue keeps happening, head back
                  to the dashboard and retry from there.
                </p>
                {error.message ? (
                  <p className="text-xs text-muted-foreground">{error.message}</p>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button onClick={reset} type="button">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </body>
    </html>
  );
}
