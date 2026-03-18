import { RegisterForm } from "@/components/forms/register-form";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <Card className="border-white/70 bg-white/85 shadow-soft backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          Start tracking tickets, work notes, and day-by-day progress in one
          place.
        </CardDescription>
      </CardHeader>
      <RegisterForm />
    </Card>
  );
}
