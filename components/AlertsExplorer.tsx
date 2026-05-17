"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { AlertCard } from "@/components/AlertCard";
import { useAlerts, useSuppliers } from "@/lib/case-store";
import {
  ALERT_STATUS_LABELS,
  ALERT_TYPE_LABELS,
  type AlertSeverity,
  type AlertStatus,
  type AlertType,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const SEVERITIES: AlertSeverity[] = ["critical", "high", "medium", "low"];
const STATUSES: AlertStatus[] = [
  "new",
  "under_review",
  "supplier_contacted",
  "evidence_requested",
  "escalated_to_audit",
  "resolved",
  "suspended_pending_investigation",
];

export function AlertsExplorer() {
  const alerts = useAlerts();
  const SUPPLIERS = useSuppliers();
  const [severities, setSeverities] = useState<Set<AlertSeverity>>(new Set());
  const [statuses, setStatuses] = useState<Set<AlertStatus>>(new Set());
  const [types, setTypes] = useState<Set<AlertType>>(new Set());

  const supplierName = (id: string) => SUPPLIERS.find((s) => s.id === id)?.name;

  const typeOptions = useMemo(() => {
    const counts = new Map<AlertType, number>();
    for (const a of alerts) counts.set(a.alert_type, (counts.get(a.alert_type) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [alerts]);

  function toggle<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) {
    setter((cur) => {
      const next = new Set(cur);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function reset() {
    setSeverities(new Set());
    setStatuses(new Set());
    setTypes(new Set());
  }

  const filtered = useMemo(() => {
    return alerts
      .filter((a) => severities.size === 0 || severities.has(a.severity))
      .filter((a) => statuses.size === 0 || statuses.has(a.status))
      .filter((a) => types.size === 0 || types.has(a.alert_type))
      .sort((a, b) => b.first_detected_date.localeCompare(a.first_detected_date));
  }, [alerts, severities, statuses, types]);

  const counts: Record<AlertSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const a of alerts) counts[a.severity] += 1;

  const anyFilter = severities.size > 0 || statuses.size > 0 || types.size > 0;

  return (
    <div className="space-y-6">
      <Card padded={false}>
        <div className="space-y-2.5 border-b border-ink-100 px-5 py-3">
          <Row label="Severity">
            {SEVERITIES.map((s) => (
              <Chip key={s} active={severities.has(s)} onClick={() => toggle(setSeverities, s)} severity={s}>
                {s} <span className="opacity-60">· {counts[s]}</span>
              </Chip>
            ))}
          </Row>
          <Row label="Status">
            {STATUSES.map((s) => (
              <Chip key={s} active={statuses.has(s)} onClick={() => toggle(setStatuses, s)}>
                {ALERT_STATUS_LABELS[s]}
              </Chip>
            ))}
          </Row>
          <Row label="Type">
            {typeOptions.map(([t, n]) => (
              <Chip key={t} active={types.has(t)} onClick={() => toggle(setTypes, t)}>
                {ALERT_TYPE_LABELS[t]} <span className="opacity-60">· {n}</span>
              </Chip>
            ))}
          </Row>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[11px]">
          <span className="text-ink-500">
            <strong className="text-ink-900">{filtered.length}</strong> of {alerts.length} alerts
          </span>
          {anyFilter && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-2 py-1 font-medium text-ink-700 hover:bg-ink-50"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="flex h-48 flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-ink-700">No alerts match the current filters</p>
          <button
            onClick={reset}
            className="mt-2 text-xs font-medium text-canopy-700 hover:text-canopy-900"
          >
            Clear filters
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((a) => (
            <AlertCard key={a.alert_id} alert={a} supplierName={supplierName(a.supplier_id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 w-16 shrink-0 text-[10px] font-medium uppercase tracking-wider text-ink-500">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  severity,
  onClick,
  children,
}: {
  active: boolean;
  severity?: AlertSeverity;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const dotColor =
    severity === "critical"
      ? "bg-risk-escalate"
      : severity === "high"
        ? "bg-risk-investigate"
        : severity === "medium"
          ? "bg-risk-monitor"
          : severity === "low"
            ? "bg-ink-400"
            : null;
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize transition",
        active
          ? "border-canopy-300 bg-canopy-50 text-canopy-800"
          : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50",
      )}
    >
      {dotColor && <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />}
      {children}
    </button>
  );
}
