"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { getSession, signIn } from "next-auth/react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

function getLoginErrorMessage(error: string | undefined) {
  if (!error) return "Unable to sign in right now. Please try again.";
  if (error.includes("RATE_LIMIT_EXCEEDED"))
    return "Too many attempts. Please wait a minute and try again.";
  return "Invalid email or password.";
}

export function LoginForm({
  callbackUrl,
  notice,
}: {
  callbackUrl?: string;
  notice?: string;
}) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const onSubmit = handleSubmit((values) => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: callbackUrl ?? "/dashboard",
      });
      if (result?.error) {
        setErrorMessage(getLoginErrorMessage(result.error));
        return;
      }

      let destination = result?.url ?? callbackUrl ?? "/dashboard";

      if (!callbackUrl) {
        const session = await getSession();
        if (session?.user?.role === "ADMIN") {
          destination = "/admin";
        } else {
          destination = "/dashboard";
        }
      }

      router.replace(destination);
      router.refresh();
    });
  });

  return (
    <form noValidate onSubmit={onSubmit} className="p-6 space-y-5">
      {/* Notice */}
      {notice && (
        <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          <span className="mt-0.5">✓</span>
          {notice}
        </div>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="email">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          className="h-10"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground" htmlFor="password">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            className="h-10 pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {/* Remember me */}
      <Controller
        control={control}
        name="rememberMe"
        render={({ field }) => (
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <Checkbox
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(Boolean(checked))}
            />
            <span className="text-sm text-muted-foreground">
              Keep me signed in
            </span>
          </label>
        )}
      />

      {/* Submit */}
      <Button
        className="w-full h-10 gap-2 font-medium"
        disabled={isPending}
        type="submit"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" />
            Sign in
          </>
        )}
      </Button>

      {/* Dev hint */}
      <p className="text-center text-xs text-muted-foreground/60 pt-1">
        Demo: user@example.com · user123
      </p>
    </form>
  );
}
