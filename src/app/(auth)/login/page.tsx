import Link from "next/link";

import { LoginForm } from "@/components/forms/login-form";

function getNotice(message?: string) {
  switch (message) {
    case "password-reset-success":
      return "Your password has been reset. Sign in with your new password.";
    case "account-created":
      return "Account created! Sign in to get started.";
    default:
      return undefined;
  }
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: {
    callbackUrl?: string;
    message?: string;
  };
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your daily reporting workspace.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-soft">
        <LoginForm
          callbackUrl={searchParams?.callbackUrl}
          notice={getNotice(searchParams?.message)}
        />
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          Create one free
        </Link>
      </p>
    </div>
  );
}

