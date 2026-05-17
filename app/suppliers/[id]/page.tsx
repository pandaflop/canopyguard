"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RiskBadge } from "@/components/RiskBadge";
import { BoundaryMap } from "@/components/maps/BoundaryMap";
import { NDVIChart } from "@/components/NDVIChart";
import { SARChart } from "@/components/SARChart";
import { SupplierAlertList } from "@/components/SupplierAlertList";
import { RiskScoreBreakdown } from "@/components/RiskScoreBreakdown";
import { AuditActionPanel } from "@/components/AuditActionPanel";
import { SupplierContactCard } from "@/components/SupplierContactCard";
import { useBundle } from "@/lib/case-store";
import { COMMODITY_LABELS } from "@/lib/types";
import { formatDate, formatHectares, formatPct, formatUsd } from "@/lib/utils";
import { ChevronLeft, FileDown, Info } from "lucide-react";

export default function SupplierProfilePage({ params }: { params: { id: string } }) {
  const bundle = useBundle(params.id);
  if (!bundle) return notFound();

  const { supplier, boundary, satellite, riskScore, ndvi, sar, scenario } = bundle;
  const lossPct = Math.max(
    0,
    satellite.baselineForestCoverPct - satellite.currentForestCoverPct,
  );
  const lastNdvi = ndvi[ndvi.length - 1];
  const ndviChangePct = Math.round(
    ((lastNdvi.ndvi - lastNdvi.seasonalBaselineNdvi) / lastNdvi.seasonalBaselineNdvi) * 100,
  );

  const recommendedAction =
    riskScore.classification === "escalate"
      ? "Escalate for audit. Suspend further procurement pending supplier evidence and field verification."
      : riskScore.classification === "investigate"
        ? "Open audit case. Request supplier documentation and second-pass satellite review within 14 days."
        : riskScore.classification === "monitor"
          ? "Maintain monitoring cadence. Re-evaluate at next Sentinel-2 cycle."
          : "No action required. Continue passive monitoring.";

  return (
    <div className="space-y-6">
      {/* Breadcrumb + heading */}
      <div>
        <Link
          href="/suppliers"
          className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-800"
        >
          <ChevronLeft className="h-3 w-3" /> All suppliers
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-canopy-700">
              Supplier profile · <span className="font-mono">{supplier.id}</span>
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
              {supplier.name}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {COMMODITY_LABELS[supplier.commodity]} · {supplier.region} · {supplier.countryName}
              {supplier.parentGroup && <> · part of {supplier.parentGroup}</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RiskBadge classification={riskScore.classification} score={Math.round(riskScore.score)} />
            <Link
              href={`/reports?supplier=${supplier.id}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-canopy-700 bg-canopy-700 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-canopy-800"
            >
              <FileDown className="h-3.5 w-3.5" /> Generate evidence report
            </Link>
          </div>
        </div>
      </div>

      {/* Identity strip */}
      <Card className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Stat label="Area monitored" value={formatHectares(boundary.areaHectares)} />
        <Stat label="Boundary quality" value={`${boundary.qualityScore} · ${boundary.quality}`} />
        <Stat label="Certification" value={supplier.certification} />
        <Stat label="Documentation" value={supplier.documentationStatus} />
        <Stat label="Procurement spend" value={formatUsd(supplier.procurementSpendUsd)} />
        <Stat label="Exposure" value={formatPct(supplier.procurementExposurePct)} />
      </Card>

      {/* Recommended action */}
      <Card className="border-canopy-100 bg-gradient-to-r from-canopy-50/70 to-white">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-canopy-700 text-white">
            <Info className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-canopy-800">Recommended next action</p>
            <p className="mt-1 text-sm text-ink-900">{recommendedAction}</p>
            <p className="mt-1 text-[11px] text-ink-500">
              Last audit: {formatDate(supplier.lastAuditDate)} · Next audit due: {formatDate(supplier.nextAuditDueDate)}
            </p>
          </div>
        </div>
      </Card>

      {/* Two-column main */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left: maps + charts */}
        <div className="space-y-6 xl:col-span-2">
          <Card padded={false}>
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-ink-900">
                  Boundary &amp; satellite composites
                </h3>
                <p className="mt-0.5 text-xs text-ink-500">
                  2020 baseline vs current composite with detected disturbance overlay
                </p>
              </div>
              <Badge tone="muted">Sentinel-2 + Sentinel-1 + Hansen GFC</Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-500">
                  2020 baseline composite
                </p>
                <BoundaryMap
                  boundary={boundary}
                  layer="baseline"
                  title={`Baseline · ${satellite.baselineForestCoverPct}% forest`}
                  supplierId={supplier.id}
                  scenario={scenario}
                />
              </div>
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-500">
                  Current composite ({satellite.lastObservationDate})
                </p>
                <BoundaryMap
                  boundary={boundary}
                  layer="current"
                  title={`Current · ${satellite.currentForestCoverPct}% forest`}
                  showDisturbance={lossPct >= 2}
                  disturbancePct={Math.min(0.55, Math.max(0.08, lossPct / 50))}
                  supplierId={supplier.id}
                  scenario={scenario}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-ink-100 px-5 py-4 text-xs">
              <Stat label="2020 forest cover" value={formatPct(satellite.baselineForestCoverPct)} />
              <Stat label="Current forest cover" value={formatPct(satellite.currentForestCoverPct)} />
              <Stat
                label="Estimated post-2020 loss"
                value={`${formatPct(lossPct)} · ${formatHectares(satellite.forestLossHectares)}`}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="NDVI vs same-season baseline"
              subtitle="Compares current NDVI against the same-week historical median (2017-2020)"
              action={
                <span className="text-xs font-mono text-ink-600">
                  Last reading: {lastNdvi.ndvi.toFixed(3)} ({ndviChangePct}%)
                </span>
              }
            />
            <NDVIChart data={ndvi} />
            <p className="mt-3 text-[11px] leading-snug text-ink-500">
              A sudden NDVI drop against the same-season historical baseline — rather than the previous month — is what
              distinguishes likely vegetation loss from normal seasonal variation. Persistent values below 0.25 (red
              dashed line) suggest bare soil or land conversion.
            </p>
          </Card>

          <Card>
            <CardHeader
              title="Sentinel-1 SAR canopy disturbance"
              subtitle="Radar backscatter detects structural canopy change, even through cloud cover"
              action={
                <span className="text-xs font-mono text-ink-600">
                  Last: {sar[sar.length - 1].backscatterDb} dB
                </span>
              }
            />
            <SARChart data={sar} />
            <p className="mt-3 text-[11px] leading-snug text-ink-500">
              A sustained increase in VV-polarized backscatter relative to baseline often correlates with canopy
              removal. When the SAR signal coincides with an NDVI anomaly, the combined evidence increases the
              confidence that an alert reflects real disturbance rather than atmospheric noise.
            </p>
          </Card>

          <SupplierAlertList supplierId={supplier.id} />
        </div>

        {/* Right: scoring + actions + evidence */}
        <div className="space-y-6">
          <RiskScoreBreakdown score={riskScore} />

          <Card>
            <CardHeader title="Evidence summary" subtitle="What we have on file for this supplier" />
            <ul className="space-y-2 text-sm">
              <EvidenceRow label="2020 baseline composite" status="complete" />
              <EvidenceRow label="Current Sentinel-2 composite" status="complete" />
              <EvidenceRow label="Sentinel-1 SAR rolling series" status="complete" />
              <EvidenceRow
                label="External alert cross-check (RADD / GLAD / GFW)"
                status={satellite.externalAlertMatchCount > 0 ? "complete" : "complete"}
                hint={`${satellite.externalAlertMatchCount} matching alerts`}
              />
              <EvidenceRow
                label="Supplier-submitted documentation"
                status={
                  supplier.documentationStatus === "complete"
                    ? "complete"
                    : supplier.documentationStatus === "partial"
                      ? "partial"
                      : "missing"
                }
              />
              <EvidenceRow
                label="Protected-area cross-check (WDPA)"
                status="complete"
                hint={
                  boundary.protectedAreaOverlapHectares > 0
                    ? `${formatHectares(boundary.protectedAreaOverlapHectares)} overlap`
                    : "no overlap detected"
                }
              />
            </ul>
          </Card>

          <AuditActionPanel supplierId={supplier.id} supplierName={supplier.name} />

          <SupplierContactCard
            supplierId={supplier.id}
            supplierName={supplier.name}
            contactName={supplier.primaryContact.name}
            contactEmail={supplier.primaryContact.email}
            onboardedAt={supplier.onboardedAt}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-ink-900">{value}</p>
    </div>
  );
}

function EvidenceRow({
  label,
  status,
  hint,
}: {
  label: string;
  status: "complete" | "partial" | "missing";
  hint?: string;
}) {
  const tone =
    status === "complete" ? "low" : status === "partial" ? "monitor" : "escalate";
  return (
    <li className="flex items-center justify-between gap-3 border-b border-dashed border-ink-100 pb-2 last:border-b-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm text-ink-900">{label}</p>
        {hint && <p className="text-[11px] text-ink-500">{hint}</p>}
      </div>
      <Badge tone={tone as any}>{status}</Badge>
    </li>
  );
}
