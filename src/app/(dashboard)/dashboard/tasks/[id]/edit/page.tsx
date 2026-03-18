import { PageIntro } from "@/components/shared/page-intro";
import { TaskForm } from "@/components/tasks/task-form";

export default function EditTaskPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-8">
      <PageIntro
        description="Update the ticket context, story point, status, tags, or daily notes without losing the history trail."
        eyebrow="Edit task"
        title="Refine an existing task entry."
      />
      <TaskForm mode="edit" taskId={params.id} />
    </div>
  );
}
