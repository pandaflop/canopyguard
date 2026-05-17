"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { NDVIObservation } from "@/lib/types";

export function NDVIChart({ data, height = 240 }: { data: NDVIObservation[]; height?: number }) {
  const formatted = data.map((d) => ({
    date: d.date.slice(0, 7),
    ndvi: d.ndvi,
    baseline: d.seasonalBaselineNdvi,
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
          domain={[0, 1]}
          tick={{ fontSize: 10, fill: "rgb(95,106,128)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v.toFixed(1)}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            value.toFixed(3),
            name === "ndvi" ? "Current NDVI" : "Seasonal baseline",
          ]}
        />
        <ReferenceLine y={0.25} stroke="#b6354b" strokeDasharray="4 4" strokeWidth={1} />
        <defs>
          <linearGradient id="ndviGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3e7d60" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3e7d60" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="baseline"
          stroke="#8ebaa1"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          fill="none"
        />
        <Area
          type="monotone"
          dataKey="ndvi"
          stroke="#234f3d"
          strokeWidth={2}
          fill="url(#ndviGrad)"
        />
        <Line type="monotone" dataKey="ndvi" stroke="#234f3d" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
