import { Badge } from "@/components/ui/badge";
import { formatDisplayDate, formatTaskGroupLabel } from "@/lib/utils";

type PrintTask = {
  id: string;
  date: Date;
  ticketNumber: string;
  ticketTitle: string;
  storyPoint: number | null;
  status: string;
  dailyReport: string;
};

function sanitizePrintHtml(value: string) {
  const base = value || "<p>No daily report notes added yet.</p>";

  return base
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function PrintTaskReport({
  startDate,
  endDate,
  tasks,
}: {
  startDate: string;
  endDate: string;
  tasks: PrintTask[];
}) {
  const groupedTasks = tasks.reduce<Map<string, PrintTask[]>>((acc, task) => {
    const key = task.date.toISOString().slice(0, 10);
    const existing = acc.get(key) ?? [];
    existing.push(task);
    acc.set(key, existing);
    return acc;
  }, new Map());

  const totalStoryPoints = tasks.reduce(
    (total, task) => total + (task.storyPoint ?? 0),
    0,
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <section className="rounded-[2rem] border border-border/70 bg-white p-6 shadow-soft print:rounded-none print:border-none print:shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">
              Print preview
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Daily task report
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatDisplayDate(startDate)} to {formatDisplayDate(endDate)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {tasks.length} task{tasks.length === 1 ? "" : "s"}
            </Badge>
            <Badge variant="accent">{totalStoryPoints} story points</Badge>
          </div>
        </div>
      </section>

      {Array.from(groupedTasks.entries()).map(([date, items]) => (
        <section className="print-report-page space-y-4" key={date}>
          <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-3">
            <div>
              <h2 className="text-xl font-semibold">{formatTaskGroupLabel(date)}</h2>
              <p className="text-sm text-muted-foreground">
                {formatDisplayDate(date)}
              </p>
            </div>
            <Badge variant="outline">
              {items.length} task{items.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="space-y-4">
            {items.map((task) => (
              <article
                className="break-inside-avoid rounded-[1.5rem] border border-border/70 bg-white p-5 shadow-sm print:rounded-none print:border print:border-slate-300 print:shadow-none"
                key={task.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/10 text-primary">
                    {task.ticketNumber}
                  </Badge>
                  <Badge variant="outline">
                    {task.storyPoint == null ? "No SP" : `${task.storyPoint} SP`}
                  </Badge>
                  <Badge variant="outline">
                    {task.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{task.ticketTitle}</h3>
                <div
                  className="tiptap-content mt-4 text-sm leading-6 text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: sanitizePrintHtml(task.dailyReport),
                  }}
                />
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
