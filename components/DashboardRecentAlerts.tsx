"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { AlertCard } from "@/components/AlertCard";
import { useAlerts, useSuppliers } from "@/lib/case-store";

export function DashboardRecentAlerts({ height = 420 }: { height?: number }) {
  const alerts = useAlerts();
  const suppliers = useSuppliers();
  // Sort by most recent. Show all of them — list scrolls inside the fixed-height card.
  const recent = [...alerts].sort((a, b) =>
    b.first_detected_date.localeCompare(a.first_detected_date),
  );

  return (
    <Card padded={false} className="flex flex-col" >
      <div style={{ height }} className="flex flex-col">
        <div className="flex shrink-0 items-start justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-ink-900">Recent alerts</h3>
            <p className="mt-0.5 text-xs text-ink-500">
              {alerts.length} total · scroll for more
            </p>
          </div>
          <Link href="/alerts" className="text-xs font-medium text-canopy-700 hover:text-canopy-900">
            View all
          </Link>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-3">
          {recent.length === 0 && (
            <p className="py-8 text-center text-xs text-ink-500">No alerts surfaced yet.</p>
          )}
          {recent.map((a) => (
            <AlertCard
              key={a.alert_id}
              alert={a}
              supplierName={suppliers.find((s) => s.id === a.supplier_id)?.name}
              compact
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
