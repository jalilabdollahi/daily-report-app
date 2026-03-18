import { Badge } from "@/components/ui/badge";
import type { TaskStatus } from "@/types/task";

const statusClassMap: Record<TaskStatus, string> = {
  TODO: "border-slate-300 bg-slate-100 text-slate-700",
  IN_PROGRESS: "border-sky-200 bg-sky-100 text-sky-700",
  DONE: "border-emerald-200 bg-emerald-100 text-emerald-700",
  BLOCKED: "border-rose-200 bg-rose-100 text-rose-700",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge className={statusClassMap[status]} variant="outline">
      {status.replace("_", " ")}
    </Badge>
  );
}
