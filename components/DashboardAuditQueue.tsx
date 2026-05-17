"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RiskBadge } from "@/components/RiskBadge";
import { useAudits, useSupplierBundles } from "@/lib/case-store";
import { COMMODITY_LABELS } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";

export function DashboardAuditQueue() {
  const audits = useAudits();
  const bundles = useSupplierBundles();
  const preview = audits.slice(0, 6);
  return (
    <Card padded={false}>
      <div className="flex items-start justify-between px-5 pt-5">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-ink-900">Audit priority queue</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            Cases automatically opened when supplier risk crossed the investigate threshold
          </p>
        </div>
        <Link href="/audit" className="text-xs font-medium text-canopy-700 hover:text-canopy-900">
          Open audit queue
        </Link>
      </div>
      <div className="overflow-x-auto px-2 py-3">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-ink-500">
              <th className="px-3 py-2 font-medium">Case</th>
              <th className="px-3 py-2 font-medium">Supplier</th>
              <th className="px-3 py-2 font-medium">Priority</th>
              <th className="px-3 py-2 font-medium">Risk</th>
              <th className="px-3 py-2 font-medium">Assigned</th>
              <th className="px-3 py-2 font-medium">Due</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {preview.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-xs text-ink-500" colSpan={7}>
                  No open audit cases.
                </td>
              </tr>
            )}
            {preview.map((c) => {
              const b = bundles.find((x) => x.supplier.id === c.supplierId);
              if (!b) return null;
              return (
                <tr key={c.id} className="hover:bg-ink-50/60">
                  <td className="px-3 py-2 font-mono text-xs text-ink-700">{c.id}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/suppliers/${b.supplier.id}`}
                      className="text-sm font-medium text-ink-900 hover:text-canopy-800"
                    >
                      {b.supplier.name}
                    </Link>
                    <p className="text-[11px] text-ink-500">{COMMODITY_LABELS[b.supplier.commodity]}</p>
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={c.priority <= 2 ? "escalate" : c.priority <= 3 ? "investigate" : "monitor"}>
                      P{c.priority}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <RiskBadge
                      classification={b.riskScore.classification}
                      score={Math.round(b.riskScore.score)}
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-700">{c.assignedTo}</td>
                  <td className="px-3 py-2 text-xs text-ink-700">{formatRelativeDate(c.dueBy)}</td>
                  <td className="px-3 py-2">
                    <Badge tone="muted">{c.status.replace(/_/g, " ")}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
