import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-12"
      id="main-content"
    >
      <Card className="w-full max-w-2xl border-accent/20 bg-white/85 shadow-soft">
        <CardHeader className="space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-accent">
              403
            </p>
            <CardTitle className="text-3xl">Access denied</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Your account does not have permission to open that area.
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/settings">Open settings</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
