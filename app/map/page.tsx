"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { WorldSupplierMap } from "@/components/maps/WorldSupplierMap";
import { Badge } from "@/components/ui/Badge";
import { RiskBadge } from "@/components/RiskBadge";
import Link from "next/link";
import { useSupplierBundles } from "@/lib/case-store";
import { classificationsFrom, countryBreakdownFrom } from "@/lib/aggregations";
import { COMMODITY_LABELS } from "@/lib/types";
import { formatHectares, formatPct } from "@/lib/utils";

export default function MapPage() {
  const bundles = useSupplierBundles();
  const classifications = classificationsFrom(bundles);
  const countries = countryBreakdownFrom(bundles);
  const suppliers = bundles.map((b) => b.supplier);
  const boundaries = bundles.map((b) => b.boundary);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-canopy-700">Map</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">Global supplier map</h1>
        <p className="mt-1 text-sm text-ink-500">
          Each marker is a satellite-monitored supplier polygon. Color reflects current composite risk classification.
        </p>
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-2">
            <Badge tone="canopy">Layer · Risk classification</Badge>
            <Badge tone="muted">Layer · Commodity</Badge>
            <Badge tone="muted">Layer · External alerts (RADD/GLAD)</Badge>
          </div>
          <div className="text-[11px] text-ink-500">
            {boundaries.length} polygons ·{" "}
            {formatHectares(boundaries.reduce((s, b) => s + b.areaHectares, 0))} monitored
          </div>
        </div>
        <div className="px-3 py-3">
          <WorldSupplierMap
            suppliers={suppliers}
            boundaries={boundaries}
            classifications={classifications}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Suppliers on the map" subtitle="Sorted by procurement exposure" />
          <ul className="divide-y divide-ink-100">
            {bundles
              .slice()
              .sort((a, b) => b.supplier.procurementExposurePct - a.supplier.procurementExposurePct)
              .map(({ supplier, riskScore, boundary }) => (
                <li key={supplier.id} className="flex items-center justify-between py-2.5">
                  <Link href={`/suppliers/${supplier.id}`} className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900 hover:text-canopy-800">
                      {supplier.name}
                    </p>
                    <p className="truncate text-[11px] text-ink-500">
                      {COMMODITY_LABELS[supplier.commodity]} · {supplier.region} ·{" "}
                      {formatHectares(boundary.areaHectares)}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-ink-500">
                      {formatPct(supplier.procurementExposurePct)}
                    </span>
                    <RiskBadge classification={riskScore.classification} score={Math.round(riskScore.score)} />
                  </div>
                </li>
              ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Country / region exposure" subtitle="Procurement share and average supplier risk" />
          <ul className="divide-y divide-ink-100">
            {countries.map((c) => (
              <li key={c.countryIso3} className="py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-ink-900">{c.countryName}</p>
                  <p className="font-mono text-xs text-ink-700">avg risk {c.averageRisk}</p>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (c.exposurePct / 30) * 100)}%`,
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
                <p className="mt-1 text-[11px] text-ink-500">
                  {c.supplierCount} suppliers · {formatHectares(c.totalHectares)} ·{" "}
                  {formatPct(c.exposurePct)} of portfolio
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
