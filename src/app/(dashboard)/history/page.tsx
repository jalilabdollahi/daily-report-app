import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDisplayDateTime } from "@/lib/utils";

const historyItems = [
  {
    label: "Task created",
    time: "2026-03-16T09:15:00.000Z",
    detail: "Created OPS-2418 with Bug and Urgent tags.",
  },
  {
    label: "Task updated",
    time: "2026-03-15T16:30:00.000Z",
    detail: "Marked APP-1192 as complete and saved the final daily note.",
  },
];

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">
          Audit trail
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Activity timeline shell
        </h1>
      </div>
      <Card className="border-white/70 bg-white/80 shadow-soft">
        <CardHeader>
          <CardTitle className="text-2xl">Recent changes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {historyItems.map((item) => (
            <div
              className="rounded-2xl border border-border/70 bg-background/70 p-4"
              key={`${item.label}-${item.time}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-2">
                  <Badge variant="outline">{item.label}</Badge>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {formatDisplayDateTime(item.time)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
