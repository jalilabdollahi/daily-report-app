import { PageIntro } from "@/components/shared/page-intro";
import { TaskForm } from "@/components/tasks/task-form";

export default function NewTaskPage() {
  return (
    <div className="space-y-8">
      <PageIntro
        description="Fill in the full task details, daily report, tags, and attachments in one place."
        eyebrow="Create task"
        title="Add a new daily report entry."
      />
      <TaskForm mode="create" />
    </div>
  );
}
