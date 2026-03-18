"use client";

import { format } from "date-fns";

type ChartPoint = {
  date: string;
  count: number;
};

export function ActivityChart({ points }: { points: ChartPoint[] }) {
  const maxCount = Math.max(...points.map((point) => point.count), 1);

  return (
    <div className="grid grid-cols-7 gap-3">
      {points.map((point) => {
        const height = `${Math.max((point.count / maxCount) * 100, point.count ? 18 : 6)}%`;

        return (
          <div className="flex flex-col items-center gap-3" key={point.date}>
            <div className="flex h-40 w-full items-end rounded-3xl bg-secondary/70 p-3">
              <div
                className="w-full rounded-2xl bg-gradient-to-t from-primary to-accent transition-all"
                style={{ height }}
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground">
                {format(new Date(point.date), "EEE")}
              </p>
              <p className="text-xs text-muted-foreground">{point.count}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
