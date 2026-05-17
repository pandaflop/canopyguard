"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BoundaryMap } from "@/components/maps/BoundaryMap";
import { NDVIChart } from "@/components/NDVIChart";
import { SARChart } from "@/components/SARChart";
import { AlertTimeline } from "@/components/AlertTimeline";
import { useAlert, useBundle, useCaseStore } from "@/lib/case-store";
import {
  ALERT_STATUS_LABELS,
  ALERT_TYPE_LABELS,
  type AlertStatus,
} from "@/lib/types";
import { formatDate, formatHectares, formatPct } from "@/lib/utils";
import { ChevronLeft, FileDown, Upload, Check } from "lucide-react";

const ACTIONS: { status: AlertStatus; label: string; variant?: "primary" | "secondary" | "danger" }[] = [
  { status: "under_review", label: "Move to Under review", variant: "primary" },
  { status: "supplier_contacted", label: "Notify supplier & request explanation", variant: "secondary" },
  { status: "evidence_requested", label: "Request supplier evidence upload", variant: "secondary" },
  { status: "escalated_to_audit", label: "Escalate to internal audit", variant: "secondary" },
  { status: "resolved", label: "Mark resolved", variant: "secondary" },
  { status: "suspended_pending_investigation", label: "Suspend supplier pending investigation", variant: "danger" },
];

export function AlertDetailClient({ alertId }: { alertId: string }) {
  const alert = useAlert(alertId);
  const { updateAlertStatus, appendAlertNote, toast } = useCaseStore();
  const [note, setNote] = useState("");
  const [responseFile, setResponseFile] = useState<string | null>(null);
  const router = useRouter();

  // Hook must be called unconditionally; safe-fallback the id so the
  // hook order doesn't change between renders.
  const bundle = useBundle(alert?.supplier_id ?? "");
  if (!alert || !bundle) return notFound();
  const { supplier, boundary, ndvi, sar, scenario } = bundle;

  const severityTone =
    alert.severity === "critical"
      ? "escalate"
      : alert.severity === "high"
        ? "investigate"
        : alert.severity === "medium"
          ? "monitor"
          : "muted";

  function onUploadResponse(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResponseFile(file.name);
    toast(`Supplier response attached: ${file.name}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/alerts"
          className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-800"
        >
          <ChevronLeft className="h-3 w-3" /> All alerts
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-canopy-700">
              Alert · <span className="font-mono">{alert.alert_id}</span>
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
              {ALERT_TYPE_LABELS[alert.alert_type]}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              On{" "}
              <Link href={`/suppliers/${supplier.id}`} className="font-medium text-ink-700 hover:text-canopy-800">
                {supplier.name}
              </Link>{" "}
              · {supplier.region}, {supplier.countryName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={severityTone}>{alert.severity}</Badge>
            <Badge tone="canopy">{ALERT_STATUS_LABELS[alert.status]}</Badge>
            <Badge tone="muted">{Math.round(alert.confidence * 100)}% confidence</Badge>
          </div>
        </div>
      </div>

      <Card className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Stat label="Detected" value={formatDate(alert.first_detected_date)} />
        <Stat label="Affected area" value={formatHectares(alert.affected_area_hectares)} />
        <Stat label="% of boundary" value={formatPct(alert.affected_area_percentage)} />
        <Stat label="NDVI change" value={`${alert.ndvi_change_percentage}%`} />
        <Stat label="SAR confirmation" value={alert.sar_confirmation_level} />
        <Stat label="External match" value={alert.external_alert_match ? "Yes" : "No"} />
      </Card>

      <div className="rounded-xl border border-canopy-100 bg-canopy-50/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-canopy-800">Recommended action</p>
        <p className="mt-1 text-sm text-ink-900">{alert.recommended_action}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card padded={false}>
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-ink-900">
                  Satellite evidence timeline
                </h3>
                <p className="mt-0.5 text-xs text-ink-500">
                  Boundary view with detected disturbance overlay
                </p>
              </div>
              <Badge tone="muted">
                Persistence: {alert.persistence_status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-2">
              <BoundaryMap
                boundary={boundary}
                layer="baseline"
                title="Before · 2020 baseline"
                supplierId={supplier.id}
                scenario={scenario}
              />
              <BoundaryMap
                boundary={boundary}
                layer="current"
                title="After · current composite"
                showDisturbance
                disturbancePct={Math.min(0.5, Math.max(0.1, alert.affected_area_percentage / 100))}
                supplierId={supplier.id}
                scenario={scenario}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="NDVI signal" subtitle="Same-season baseline comparison" />
            <NDVIChart data={ndvi} />
          </Card>

          <Card>
            <CardHeader title="Sentinel-1 SAR confirmation" subtitle="VV backscatter trend & rolling baseline" />
            <SARChart data={sar} />
          </Card>

          <Card>
            <CardHeader
              title="Evidence summary"
              subtitle="Auto-generated language; review carefully before action"
            />
            <p className="text-sm leading-relaxed text-ink-800">{alert.evidence_summary}</p>
            <p className="mt-3 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900">
              CanopyGuard surfaces possible disturbance signals. Confirmation of land-use change requires human review
              and, where appropriate, ground verification. Replanting cycles and harvest events may produce signals
              that resemble deforestation.
            </p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Reviewer workflow"
              subtitle="Move the alert through the standard review path"
              action={<Badge tone="canopy">{ALERT_STATUS_LABELS[alert.status]}</Badge>}
            />
            <div className="space-y-2">
              {ACTIONS.map((a) => {
                const isCurrent = alert.status === a.status;
                return (
                  <Button
                    key={a.status}
                    size="sm"
                    variant={isCurrent ? "outline" : a.variant ?? "secondary"}
                    className="w-full justify-start"
                    onClick={() => updateAlertStatus(alert.alert_id, a.status)}
                    disabled={isCurrent}
                  >
                    {isCurrent && <Check className="h-3.5 w-3.5" />}
                    {a.label}
                  </Button>
                );
              })}
            </div>
            <div className="mt-4 rounded-md border border-dashed border-ink-200 bg-ink-50 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">
                Supplier response
              </p>
              <p className="mt-1 text-xs text-ink-600">
                Upload a supplier explanation or supporting documentation (e.g., replanting plan, change-of-use
                permit).
              </p>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50">
                <Upload className="h-3.5 w-3.5" />
                {responseFile ? "Replace file" : "Upload response"}
                <input type="file" className="hidden" onChange={onUploadResponse} />
              </label>
              {responseFile && (
                <p className="mt-2 font-mono text-[11px] text-canopy-800">✓ {responseFile}</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Reviewer notes" />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[120px] w-full resize-y rounded-md border border-ink-200 bg-ink-50 p-3 text-xs text-ink-900 placeholder:text-ink-400 focus:border-canopy-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-canopy-500/15"
              placeholder="Document your review rationale, observations from the satellite tiles, and any supplier conversations…"
            />
            <Button
              size="sm"
              variant="primary"
              className="mt-3"
              disabled={!note.trim()}
              onClick={() => {
                appendAlertNote(alert.alert_id, note.trim());
                setNote("");
                router.refresh();
              }}
            >
              Save note
            </Button>
          </Card>

          <AlertTimeline entries={alert.decisionLog} />

          <Card>
            <CardHeader title="Evidence packaging" />
            <p className="text-xs text-ink-600">
              Bundle this alert and its satellite evidence into the supplier&apos;s next compliance report.
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() => toast(`Added ${alert.alert_id} to ${supplier.name} evidence report`)}
            >
              <FileDown className="h-3.5 w-3.5" /> Add to evidence report
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium capitalize text-ink-900">{value}</p>
    </div>
  );
}
