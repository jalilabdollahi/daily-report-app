import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: {
    token?: string;
  };
}) {
  return (
    <Card className="border-white/70 bg-white/85 shadow-soft backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>
          Choose a new password that meets the security rules for this
          workspace.
        </CardDescription>
      </CardHeader>
      <ResetPasswordForm token={searchParams?.token} />
    </Card>
  );
}
