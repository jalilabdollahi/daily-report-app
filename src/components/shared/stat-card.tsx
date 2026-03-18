import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatCardData } from "@/types";

export function StatCard({ helper, label, value }: StatCardData) {
  return (
    <Card className="border-white/70 bg-white/80 shadow-soft backdrop-blur">
      <CardHeader className="space-y-1 pb-3">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        <CardTitle className="text-3xl font-semibold">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}
