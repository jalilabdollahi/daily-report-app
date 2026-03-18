import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const reportCards = [
  {
    ticket: "OPS-2418",
    title: "Stabilize nightly backup verification",
    body: "Investigated the retention mismatch, reproduced the failing verification step, and prepared the remediation path.",
    status: "In progress",
  },
  {
    ticket: "APP-1192",
    title: "Prepare daily report dashboard wireframe",
    body: "Outlined the task entry workflow and the card hierarchy for an easy end-of-day review.",
    status: "Done",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">
          Report list
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Task entry surface
        </h1>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {reportCards.map((report) => (
          <Card
            className="border-white/70 bg-white/80 shadow-soft"
            key={report.ticket}
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-xl">{report.ticket}</CardTitle>
                <Badge>{report.status}</Badge>
              </div>
              <p className="text-lg font-medium">{report.title}</p>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              {report.body}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
