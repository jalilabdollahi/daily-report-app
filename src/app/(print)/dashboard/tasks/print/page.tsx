import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PrintTrigger } from "@/components/tasks/print-trigger";
import { PrintTaskReport } from "@/components/tasks/print-task-report";
import { Button } from "@/components/ui/button";
import { getTasksForTransfer } from "@/lib/task-transfer";
import { taskExportQuerySchema } from "@/lib/validations/task";

export default async function TaskPrintPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const parsedQuery = taskExportQuerySchema.safeParse({
    format: "pdf",
    startDate:
      typeof searchParams.startDate === "string" ? searchParams.startDate : undefined,
    endDate:
      typeof searchParams.endDate === "string" ? searchParams.endDate : undefined,
    status: searchParams.status,
    tags: searchParams.tags,
  });

  if (!parsedQuery.success) {
    redirect("/dashboard/tasks");
  }

  const tasks = await getTasksForTransfer({
    userId: session.user.id,
    startDate: parsedQuery.data.startDate,
    endDate: parsedQuery.data.endDate,
    status: parsedQuery.data.status,
    tags: parsedQuery.data.tags,
  });

  return (
    <div className="space-y-6">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 pt-6 print:hidden">
        <Button asChild variant="ghost">
          <Link href="/dashboard/tasks">Back to tasks</Link>
        </Button>
        <PrintTrigger />
      </div>
      <PrintTaskReport
        endDate={parsedQuery.data.endDate}
        startDate={parsedQuery.data.startDate}
        tasks={tasks}
      />
    </div>
  );
}
