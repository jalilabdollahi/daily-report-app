import { AdminUserDetailScreen } from "@/components/admin/admin-user-detail-screen";

export default function AdminUserPage({
  params,
}: {
  params: { id: string };
}) {
  return <AdminUserDetailScreen userId={params.id} />;
}
