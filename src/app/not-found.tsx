import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-12"
      id="main-content"
    >
      <Card className="w-full max-w-2xl border-white/70 bg-white/85 shadow-soft">
        <CardHeader className="space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Compass className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">
              404
            </p>
            <CardTitle className="text-3xl">Page not found</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              That page is not available anymore, or the link was incomplete.
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/tasks">Open tasks</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
