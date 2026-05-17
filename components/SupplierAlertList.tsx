"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { AlertCard } from "@/components/AlertCard";
import { useAlerts } from "@/lib/case-store";

export function SupplierAlertList({ supplierId }: { supplierId: string }) {
  const alerts = useAlerts();
  const supplierAlerts = alerts.filter((a) => a.supplier_id === supplierId);

  return (
    <Card padded={false}>
      <div className="flex items-start justify-between px-5 pt-5">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-ink-900">Alert history</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            {supplierAlerts.length} alert{supplierAlerts.length === 1 ? "" : "s"} generated across the current
            monitoring window
          </p>
        </div>
        <Link href={`/alerts`} className="text-xs font-medium text-canopy-700 hover:text-canopy-900">
          View all alerts
        </Link>
      </div>
      <div className="space-y-2 px-5 py-4">
        {supplierAlerts.length === 0 && (
          <div className="rounded-md border border-dashed border-ink-200 bg-ink-50 p-6 text-center">
            <p className="text-sm font-medium text-ink-700">No detected post-2020 forest-loss signal</p>
            <p className="mt-1 text-xs text-ink-500">
              Based on available public satellite data and the supplied boundary.
            </p>
          </div>
        )}
        {supplierAlerts.map((a) => (
          <AlertCard key={a.alert_id} alert={a} />
        ))}
      </div>
    </Card>
  );
}
