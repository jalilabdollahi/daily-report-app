import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <Card className="border-white/70 bg-white/85 shadow-soft backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl">Forgot password</CardTitle>
        <CardDescription>
          We will generate a secure reset link and log it for local development.
        </CardDescription>
      </CardHeader>
      <ForgotPasswordForm />
    </Card>
  );
}
