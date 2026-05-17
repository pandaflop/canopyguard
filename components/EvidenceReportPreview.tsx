import { BoundaryMap } from "@/components/maps/BoundaryMap";
import { NDVIChart } from "@/components/NDVIChart";
import { SARChart } from "@/components/SARChart";
import { RiskBadge } from "@/components/RiskBadge";
import type { SupplierBundle } from "@/lib/mock-data";
import { ALERT_TYPE_LABELS, COMMODITY_LABELS } from "@/lib/types";
import { formatDate, formatHectares, formatPct } from "@/lib/utils";
import { Leaf } from "lucide-react";

// Print-friendly preview of the due-diligence report. Production renders
// this server-side to PDF via Playwright/Chromium.

export function EvidenceReportPreview({ bundle }: { bundle: SupplierBundle }) {
  const { supplier, boundary, satellite, riskScore, alerts, ndvi, sar, scenario } = bundle;

  return (
    <div className="mx-auto max-w-[920px] rounded-xl border border-ink-200/70 bg-white p-10 shadow-card">
      {/* Header */}
      <header className="flex items-start justify-between border-b border-ink-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-canopy-700 text-white">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-canopy-800">CanopyGuard</p>
            <p className="text-[11px] text-ink-500">Satellite-based due diligence evidence report</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-ink-500">Report ID</p>
          <p className="font-mono text-sm font-medium text-ink-900">RPT-{supplier.id}-{new Date().getFullYear()}-Q2</p>
          <p className="mt-1 text-[11px] text-ink-500">Generated {formatDate(new Date().toISOString())}</p>
        </div>
      </header>

      {/* Supplier identity */}
      <section className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <SectionTitle>Supplier identity</SectionTitle>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Field label="Supplier" value={supplier.name} />
            <Field label="Parent group" value={supplier.parentGroup ?? "—"} />
            <Field label="Commodity" value={COMMODITY_LABELS[supplier.commodity]} />
            <Field label="Country / region" value={`${supplier.countryName} — ${supplier.region}`} />
            <Field label="Certification" value={supplier.certification} />
            <Field label="Documentation" value={supplier.documentationStatus} />
            <Field label="Last audit" value={formatDate(supplier.lastAuditDate)} />
            <Field label="Procurement exposure" value={formatPct(supplier.procurementExposurePct)} />
          </dl>
        </div>
        <div>
          <SectionTitle>Risk summary</SectionTitle>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-4xl font-semibold tracking-tight text-ink-900">{Math.round(riskScore.score)}</span>
            <span className="text-sm text-ink-500">/100</span>
            <RiskBadge classification={riskScore.classification} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-600">
            Based on a combination of NDVI anomaly detection, Sentinel-1 SAR canopy disturbance signals, comparison against the
            supplier&apos;s 2020 forest baseline, and cross-checks with external forest alert systems.
          </p>
        </div>
      </section>

      {/* Maps */}
      <section className="mt-8">
        <SectionTitle>Boundary &amp; satellite composites</SectionTitle>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <BoundaryMap
            boundary={boundary}
            layer="baseline"
            title="2020 baseline composite"
            height={180}
            supplierId={supplier.id}
            scenario={scenario}
          />
          <BoundaryMap
            boundary={boundary}
            layer="current"
            title="Current composite"
            height={180}
            showDisturbance
            disturbancePct={Math.min(0.5, Math.max(0.05, (satellite.baselineForestCoverPct - satellite.currentForestCoverPct) / 60))}
            supplierId={supplier.id}
            scenario={scenario}
          />
          <BoundaryMap
            boundary={boundary}
            layer="current"
            title="Detected disturbance overlay"
            height={180}
            showDisturbance
            disturbancePct={0.3}
            supplierId={supplier.id}
            scenario={scenario}
          />
        </div>
      </section>

      {/* Charts */}
      <section className="mt-8 grid grid-cols-2 gap-6">
        <div>
          <SectionTitle>NDVI vs same-season baseline</SectionTitle>
          <div className="mt-2 rounded-lg border border-ink-100 bg-ink-50/50 p-2">
            <NDVIChart data={ndvi} height={180} />
          </div>
        </div>
        <div>
          <SectionTitle>Sentinel-1 SAR backscatter trend</SectionTitle>
          <div className="mt-2 rounded-lg border border-ink-100 bg-ink-50/50 p-2">
            <SARChart data={sar} height={180} />
          </div>
        </div>
      </section>

      {/* Alert history */}
      <section className="mt-8">
        <SectionTitle>Alert history (current monitoring period)</SectionTitle>
        <div className="mt-3 overflow-hidden rounded-lg border border-ink-100">
          <table className="w-full text-xs">
            <thead className="bg-ink-50 text-left text-[10px] uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-3 py-2 font-medium">Alert</th>
                <th className="px-3 py-2 font-medium">Severity</th>
                <th className="px-3 py-2 font-medium">Confidence</th>
                <th className="px-3 py-2 font-medium">Area</th>
                <th className="px-3 py-2 font-medium">First detected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {alerts.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-ink-500" colSpan={5}>
                    No alerts in the current monitoring window.
                  </td>
                </tr>
              )}
              {alerts.map((a) => (
                <tr key={a.alert_id}>
                  <td className="px-3 py-2 text-ink-900">{ALERT_TYPE_LABELS[a.alert_type]}</td>
                  <td className="px-3 py-2 capitalize text-ink-700">{a.severity}</td>
                  <td className="px-3 py-2 font-mono text-ink-700">{Math.round(a.confidence * 100)}%</td>
                  <td className="px-3 py-2 font-mono text-ink-700">{formatHectares(a.affected_area_hectares)}</td>
                  <td className="px-3 py-2 text-ink-700">{formatDate(a.first_detected_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Data quality + review */}
      <section className="mt-8 grid grid-cols-2 gap-6">
        <div>
          <SectionTitle>Data quality notes</SectionTitle>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-ink-700">
            <li>Boundary quality score: <strong>{boundary.qualityScore}/100</strong> ({boundary.quality.replace("_", " ")})</li>
            <li>Boundary source: <strong>{boundary.source.replace(/_/g, " ")}</strong></li>
            <li>Sentinel-2 cloud filter applied: 12-day biweekly composites</li>
            <li>Sentinel-1 GRD VV polarization, 12-day rolling baseline</li>
            {boundary.validationIssues.map((i) => (
              <li key={i.code} className="text-ink-600">
                {i.severity.toUpperCase()}: {i.message}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SectionTitle>Human review &amp; supplier response</SectionTitle>
          <dl className="mt-2 space-y-1.5 text-xs">
            <Field label="Reviewer" value="Compliance Lead — Sustainability Office" />
            <Field label="Review status" value="Reviewed; supplier engagement in progress" />
            <Field label="Supplier response" value={supplier.documentationStatus === "complete" ? "Documentation submitted" : "Pending"} />
            <Field label="Next review date" value={formatDate(supplier.nextAuditDueDate)} />
          </dl>
        </div>
      </section>

      {/* Summary + disclaimer */}
      <section className="mt-8">
        <SectionTitle>Due diligence summary</SectionTitle>
        <p className="mt-2 text-xs leading-relaxed text-ink-700">
          Based on available public satellite data and the supplier-provided boundary, this report identifies the risk
          indicators above for review. Findings constitute satellite-based due diligence evidence and are <strong>not a legal
          certification</strong> that the supplied area is free from deforestation or land conversion.
        </p>
        <p className="mt-3 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
          Disclaimer: CanopyGuard surfaces risk signals from public satellite data (Sentinel-1, Sentinel-2, Hansen GFC, RADD,
          GLAD-S2). Confirmation of land-use change requires ground verification. Replanting cycles, harvest events, and seasonal
          variation may produce signals that resemble deforestation; treat all findings as indicative until human review.
        </p>
      </section>

      <footer className="mt-8 border-t border-ink-200 pt-4 text-[10px] text-ink-500">
        CanopyGuard · Model {riskScore.modelVersion} · Report generated {new Date().toISOString()} · Page 1 of 1
      </footer>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-canopy-800">{children}</p>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-ink-100 pb-1">
      <dt className="text-[11px] text-ink-500">{label}</dt>
      <dd className="text-right text-ink-900">{value}</dd>
    </div>
  );
}
