"use client";

import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { MetricCard } from "@/components/MetricCard";
import { WorldSupplierMap } from "@/components/maps/WorldSupplierMap";
import { DashboardRecentAlerts } from "@/components/DashboardRecentAlerts";
import { DashboardAuditQueue } from "@/components/DashboardAuditQueue";
import { RiskBadge } from "@/components/RiskBadge";
import { Badge } from "@/components/ui/Badge";
import { useAlerts, useSupplierBundles } from "@/lib/case-store";
import {
  classificationsFrom,
  commodityBreakdownFrom,
  countryBreakdownFrom,
  dashboardMetrics,
} from "@/lib/aggregations";
import { computeAuditEconomics } from "@/lib/audit-economics";
import { COMMODITY_LABELS } from "@/lib/types";
import { formatHectares, formatPct, formatUsd } from "@/lib/utils";
import { ArrowRight, Leaf, ShieldCheck } from "lucide-react";

export default function DashboardPage() {
  const bundles = useSupplierBundles();
  const alerts = useAlerts();

  const m = dashboardMetrics(bundles, alerts);
  const economics = computeAuditEconomics(bundles);
  const classifications = classificationsFrom(bundles);
  const suppliers = bundles.map((b) => b.supplier);
  const boundaries = bundles.map((b) => b.boundary);
  const topRisk = [...bundles].sort((a, b) => b.riskScore.score - a.riskScore.score).slice(0, 5);
  const commodities = commodityBreakdownFrom(bundles);
  const countries = countryBreakdownFrom(bundles);
  const maxCommodityRisk = Math.max(1, ...commodities.map((c) => c.averageRisk));
  const maxCountryExposure = Math.max(1, ...countries.map((c) => c.exposurePct));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-canopy-700">
            Overview · Sustainability &amp; compliance workspace
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
            Supply chain deforestation intelligence
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Satellite-based due diligence across {m.totalSuppliers} active suppliers and{" "}
            {formatHectares(m.totalHectares)} of monitored land.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="canopy" dot>EUDR readiness mode</Badge>
          <Badge tone="muted">Monitoring window: trailing 12 months</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label="Suppliers monitored"
          value={m.totalSuppliers}
          hint={`${formatHectares(m.totalHectares)} of supplier land under satellite review`}
        />
        <MetricCard
          label="High-risk suppliers"
          value={m.highRiskSupplierCount}
          hint="Investigate or escalate band"
          trend="+2 vs last month"
          trendDirection="up"
          intent="negative"
        />
        <MetricCard
          label="Low-risk volume"
          value={`${m.lowRiskVolumePct}%`}
          hint="Share of procurement volume from low/monitor-only suppliers"
          trend="+4 pts"
          trendDirection="up"
          intent="positive"
        />
        <MetricCard
          label="Alerts this period"
          value={m.newAlertsThisMonth}
          hint={`${m.auditQueueCount} cases queued for audit`}
          trend="+5"
          trendDirection="up"
          intent="negative"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label="Evidence completeness"
          value={`${m.evidenceCompletenessPct}%`}
          hint="Suppliers with full documentation set"
        />
        <MetricCard
          label="Avg. alert response"
          value={`${m.avgAlertResponseHours}h`}
          hint="From first detection to human review"
          trend="-6h"
          trendDirection="down"
          intent="positive"
        />
        <MetricCard
          label="Audit queue"
          value={m.auditQueueCount}
          hint="Open cases awaiting field or remote audit"
        />
        <MetricCard
          label="Net annual audit savings"
          value={formatUsd(economics.netAnnualSavingsUsd)}
          hint="Cycle-extension savings minus monitoring service cost (see Analytics)"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" padded={false}>
          <div className="flex items-start justify-between px-5 pt-5">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-ink-900">Global supplier footprint</h3>
              <p className="mt-0.5 text-xs text-ink-500">
                Risk-colored markers across {countries.length} sourcing countries
              </p>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-1 text-xs font-medium text-canopy-700 hover:text-canopy-900"
            >
              Open full map <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="px-3 py-3">
            <WorldSupplierMap suppliers={suppliers} boundaries={boundaries} classifications={classifications} />
          </div>
        </Card>

        <DashboardRecentAlerts />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader
            title="Top 10 highest-risk suppliers"
            subtitle="Sorted by composite risk score"
            action={
              <Link href="/suppliers?sort=risk" className="text-xs font-medium text-canopy-700 hover:text-canopy-900">
                Open list
              </Link>
            }
          />
          <ul className="divide-y divide-ink-100">
            {topRisk.map(({ supplier, riskScore }) => (
              <li key={supplier.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <Link href={`/suppliers/${supplier.id}`} className="block">
                    <p className="truncate text-sm font-medium text-ink-900 hover:text-canopy-800">
                      {supplier.name}
                    </p>
                    <p className="truncate text-[11px] text-ink-500">
                      {COMMODITY_LABELS[supplier.commodity]} · {supplier.countryName}
                    </p>
                  </Link>
                </div>
                <RiskBadge classification={riskScore.classification} score={Math.round(riskScore.score)} />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader
            title="Commodity risk breakdown"
            subtitle="Weighted average score per commodity in portfolio"
          />
          <ul className="space-y-3">
            {commodities.map((c) => (
              <li key={c.commodity}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium text-ink-900">{COMMODITY_LABELS[c.commodity]}</p>
                  <p className="font-mono text-xs text-ink-700">{c.averageRisk}</p>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-canopy-600"
                    style={{ width: `${(c.averageRisk / maxCommodityRisk) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-ink-500">
                  {c.supplierCount} suppliers · {formatHectares(c.totalHectares)}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader
            title="Country exposure heatmap"
            subtitle="Procurement exposure × average supplier risk"
          />
          <ul className="space-y-2.5">
            {countries.map((c) => (
              <li key={c.countryIso3} className="grid grid-cols-[40px_1fr_auto] items-center gap-3">
                <span className="font-mono text-[11px] text-ink-500">{c.countryIso3}</span>
                <div>
                  <p className="text-sm font-medium text-ink-900">{c.countryName}</p>
                  <p className="text-[11px] text-ink-500">{c.supplierCount} suppliers</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 rounded-full bg-canopy-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c.exposurePct / maxCountryExposure) * 100}%`,
                        background:
                          c.averageRisk > 60
                            ? "#b6354b"
                            : c.averageRisk > 40
                              ? "#d97742"
                              : c.averageRisk > 20
                                ? "#c79621"
                                : "#2d8a55",
                      }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-ink-700">{formatPct(c.exposurePct)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <DashboardAuditQueue />

      <div className="flex flex-col items-start gap-3 rounded-xl border border-canopy-100 bg-gradient-to-r from-canopy-50 to-white p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-canopy-700 text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">
              CanopyGuard surfaces risk indicators only.
            </p>
            <p className="mt-0.5 text-xs leading-snug text-ink-600">
              Findings are satellite-based due diligence evidence — not a legal certification of land-use status. All
              alerts require human review before action against a supplier.
            </p>
          </div>
        </div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 rounded-md border border-canopy-700 bg-white px-3 py-1.5 text-xs font-medium text-canopy-800 hover:bg-canopy-50"
        >
          <Leaf className="h-3.5 w-3.5" /> Browse evidence reports
        </Link>
      </div>
    </div>
  );
}
