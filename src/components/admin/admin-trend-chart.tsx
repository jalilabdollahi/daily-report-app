"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = {
  date: string;
  count: number;
};

export function AdminTrendChart({
  color,
  data,
  type,
}: {
  data: ChartPoint[];
  color: string;
  type: "bar" | "line";
}) {
  if (type === "line") {
    return (
      <div className="h-[280px] w-full">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={data}>
            <CartesianGrid opacity={0.2} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              minTickGap={28}
              tickFormatter={(value) =>
                new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis allowDecimals={false} />
            <Tooltip
              formatter={(value) => [value, "Count"]}
              labelFormatter={(value) =>
                new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
                  dateStyle: "medium",
                })
              }
            />
            <Line
              dataKey="count"
              dot={false}
              stroke={color}
              strokeWidth={3}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data}>
          <CartesianGrid opacity={0.2} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            minTickGap={28}
            tickFormatter={(value) =>
              new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
          />
          <YAxis allowDecimals={false} />
          <Tooltip
            formatter={(value) => [value, "Count"]}
            labelFormatter={(value) =>
              new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
                dateStyle: "medium",
              })
            }
          />
          <Bar dataKey="count" fill={color} radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
