"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import type { CommodityBreakdown, CountryBreakdown } from "@/lib/aggregations";
import { COMMODITY_LABELS } from "@/lib/types";

const RISK_PIE_COLORS = ["#2d8a55", "#c79621", "#d97742", "#b6354b"];

export function CommodityRiskChart({ data }: { data: CommodityBreakdown[] }) {
  const formatted = data.map((c) => ({
    name: COMMODITY_LABELS[c.commodity],
    risk: c.averageRisk,
    suppliers: c.supplierCount,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted} margin={{ top: 8, right: 14, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgb(95,106,128)" }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "rgb(95,106,128)" }} tickLine={false} axisLine={false} />
        <Tooltip />
        <Bar dataKey="risk" radius={[5, 5, 0, 0]} fill="#3e7d60" maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CountryExposureChart({ data }: { data: CountryBreakdown[] }) {
  const formatted = data.map((c) => ({
    name: c.countryName,
    exposure: c.exposurePct,
    risk: c.averageRisk,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart layout="vertical" data={formatted} margin={{ top: 8, right: 16, left: 24, bottom: 0 }}>
        <CartesianGrid stroke="rgba(15,23,42,0.06)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "rgb(95,106,128)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v.toFixed(2)}
        />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "rgb(95,106,128)" }} tickLine={false} axisLine={false} width={110} />
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(2)}%`, "Procurement exposure"]}
        />
        <Bar dataKey="exposure" radius={[0, 5, 5, 0]} fill="#234f3d" maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RiskMixChart({
  counts,
}: {
  counts: { name: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={counts}
          dataKey="value"
          nameKey="name"
          innerRadius={48}
          outerRadius={80}
          paddingAngle={2}
        >
          {counts.map((_, idx) => (
            <Cell key={idx} fill={RISK_PIE_COLORS[idx % RISK_PIE_COLORS.length]} />
          ))}
        </Pie>
        <Legend
          verticalAlign="bottom"
          height={28}
          wrapperStyle={{ fontSize: 11, color: "rgb(95,106,128)" }}
        />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function AlertsByMonthChart({
  data,
}: {
  data: { month: string; count: number; resolved: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 14, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgb(95,106,128)" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "rgb(95,106,128)" }} tickLine={false} axisLine={false} />
        <Tooltip />
        <Line type="monotone" dataKey="count" stroke="#234f3d" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="resolved" stroke="#5e9a7c" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4" />
      </LineChart>
    </ResponsiveContainer>
  );
}
