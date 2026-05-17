"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { SARObservation } from "@/lib/types";

export function SARChart({ data, height = 240 }: { data: SARObservation[]; height?: number }) {
  const formatted = data.map((d) => ({
    date: d.date.slice(0, 7),
    backscatter: d.backscatterDb,
    baseline: d.baselineBackscatterDb,
    disturbance: Math.round(d.disturbanceProbability * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={formatted} margin={{ top: 8, right: 14, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "rgb(95,106,128)" }}
          tickLine={false}
          axisLine={{ stroke: "rgba(15,23,42,0.1)" }}
          interval={Math.ceil(formatted.length / 8)}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 10, fill: "rgb(95,106,128)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}dB`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "rgb(95,106,128)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip />
        <Bar
          yAxisId="right"
          dataKey="disturbance"
          fill="#d97742"
          fillOpacity={0.18}
          radius={[3, 3, 0, 0]}
          maxBarSize={10}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="baseline"
          stroke="#aeb6c5"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          dot={false}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="backscatter"
          stroke="#234f3d"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
