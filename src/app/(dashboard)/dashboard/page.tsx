import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { requireCurrentUser } from "@/lib/auth-helpers";

export default async function DashboardPage() {
  const user = await requireCurrentUser();

  return <DashboardOverview userName={user.name} />;
}
