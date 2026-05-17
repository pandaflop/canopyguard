"use client";

import { AlertsExplorer } from "@/components/AlertsExplorer";
import { useAlerts } from "@/lib/case-store";

export default function AlertsPage() {
  const alerts = useAlerts();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-canopy-700">Alerts</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
          {alerts.length} alerts under review
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Surfaced by NDVI anomaly detection, Sentinel-1 SAR confirmation, persistence logic, and external alert
          cross-checks. All alerts require human review before action against a supplier.
        </p>
      </div>

      <AlertsExplorer />
    </div>
  );
}
