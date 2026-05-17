"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { MetricCard } from "@/components/MetricCard";
import {
  CommodityRiskChart,
  CountryExposureChart,
  RiskMixChart,
  AlertsByMonthChart,
} from "@/components/AnalyticsCharts";
import { AuditEconomicsCard } from "@/components/AuditEconomicsCard";
import { useAlerts, useSupplierBundles } from "@/lib/case-store";
import {
  alertsByMonthFrom,
  commodityBreakdownFrom,
  countryBreakdownFrom,
} from "@/lib/aggregations";
import { formatHectares, formatUsd } from "@/lib/utils";

export default function AnalyticsPage() {
  const bundles = useSupplierBundles();
  const alerts = useAlerts();
  const commodities = commodityBreakdownFrom(bundles);
  const countries = countryBreakdownFrom(bundles);
  const months = alertsByMonthFrom(alerts);
  const suppliers = bundles.map((b) => b.supplier);

  const riskMix = [
    { name: "Low", value: bundles.filter((b) => b.riskScore.classification === "low").length },
    { name: "Monitor", value: bundles.filter((b) => b.riskScore.classification === "monitor").length },
    { name: "Investigate", value: bundles.filter((b) => b.riskScore.classification === "investigate").length },
    { name: "Escalate", value: bundles.filter((b) => b.riskScore.classification === "escalate").length },
  ];

  const goodBoundaryPct = bundles.length > 0
    ? Math.round((bundles.filter((b) => b.boundary.quality === "high").length / bundles.length) * 100)
    : 0;
  const completeDocsPct = suppliers.length > 0
    ? Math.round((suppliers.filter((s) => s.documentationStatus === "complete").length / suppliers.length) * 100)
    : 0;
  const totalSpendAtRisk = bundles
    .filter((b) => b.riskScore.classification === "investigate" || b.riskScore.classification === "escalate")
    .reduce((s, b) => s + b.supplier.procurementSpendUsd, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-canopy-700">Analytics</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">Management view</h1>
        <p className="mt-1 text-sm text-ink-500">
          Procurement, compliance, and sustainability leadership view of supply chain deforestation exposure.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label="Procurement spend at risk"
          value={formatUsd(totalSpendAtRisk)}
          hint="Annual spend on investigate/escalate suppliers"
          trend="+12%"
          trendDirection="up"
          intent="negative"
        />
        <MetricCard
          label="High-quality boundaries"
          value={`${goodBoundaryPct}%`}
          hint="Suppliers with high-quality polygon data"
          trend="+9 pts"
          trendDirection="up"
          intent="positive"
        />
        <MetricCard
          label="Documentation complete"
          value={`${completeDocsPct}%`}
          hint="Suppliers with full document set on file"
          trend="+5 pts"
          trendDirection="up"
          intent="positive"
        />
        <MetricCard
          label="Hectares monitored"
          value={formatHectares(bundles.reduce((s, b) => s + b.boundary.areaHectares, 0))}
          hint="Total supplier land under satellite monitoring"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Supplier risk by commodity"
            subtitle="Weighted average composite score per commodity in portfolio"
          />
          <CommodityRiskChart data={commodities} />
        </Card>
        <Card>
          <CardHeader title="Portfolio risk mix" subtitle="Supplier count per classification" />
          <RiskMixChart counts={riskMix} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Country exposure" subtitle="% of CPG procurement volume by country" />
          <CountryExposureChart data={countries} />
        </Card>
        <Card>
          <CardHeader title="Alert volume over time" subtitle="Detected vs resolved per month" />
          <AlertsByMonthChart data={months} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Procurement exposure by risk category" />
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-ink-500">
                <th className="py-2 font-medium">Category</th>
                <th className="py-2 font-medium">Suppliers</th>
                <th className="py-2 font-medium">Volume share</th>
                <th className="py-2 font-medium">Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {(["low", "monitor", "investigate", "escalate"] as const).map((cls) => {
                const subset = bundles.filter((b) => b.riskScore.classification === cls);
                const totalVol = suppliers.reduce((s, x) => s + x.procurementVolumeTonnesPerYear, 0);
                const vol = subset.reduce((s, b) => s + b.supplier.procurementVolumeTonnesPerYear, 0);
                const spend = subset.reduce((s, b) => s + b.supplier.procurementSpendUsd, 0);
                return (
                  <tr key={cls}>
                    <td className="py-2 capitalize text-ink-900">{cls}</td>
                    <td className="py-2 text-ink-700">{subset.length}</td>
                    <td className="py-2 font-mono text-xs text-ink-700">
                      {Math.round((vol / Math.max(totalVol, 1)) * 100)}%
                    </td>
                    <td className="py-2 font-mono text-xs text-ink-700">{formatUsd(spend)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <AuditEconomicsCard bundles={bundles} />
      </div>

      <Card>
        <CardHeader title="Product / SKU exposure" subtitle="How supplier risk flows through to your finished goods" />
        <div className="rounded-md border border-dashed border-ink-200 bg-ink-50 p-6 text-sm text-ink-600">
          Connect your bill-of-materials feed to map supplier risk through to SKU-level exposure. Placeholder for the
          product/SKU exposure module — production wires up to the procurement ERP.
        </div>
      </Card>

      <p className="text-[11px] leading-snug text-ink-500">
        Powered by Sentinel-1 SAR, Sentinel-2 NDVI, Hansen Global Forest Change, and external alert systems (RADD,
        GLAD-S2, GFW Integrated). {alerts.length} alerts ingested across the monitoring window.
      </p>
    </div>
  );
}
