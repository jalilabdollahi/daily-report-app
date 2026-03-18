import { PageIntro } from "@/components/shared/page-intro";
import { TaskDetailView } from "@/components/tasks/task-detail-view";

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-8">
      <PageIntro
        description="Review the full task entry, attached files, and the version history that led to the current state."
        eyebrow="Task detail"
        title="Inspect a task without switching into edit mode."
      />
      <TaskDetailView taskId={params.id} />
    </div>
  );
}
