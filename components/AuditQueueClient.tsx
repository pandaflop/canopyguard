"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/MetricCard";
import { useCaseStore, useSupplierBundles } from "@/lib/case-store";
import { COMMODITY_LABELS, type AuditCaseStatus } from "@/lib/types";
import { formatDate, formatHectares } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const ALL_STATUSES: AuditCaseStatus[] = ["queued", "in_progress", "awaiting_response", "closed"];

export function AuditQueueClient() {
  const { audits, updateAuditStatus } = useCaseStore();
  const bundles = useSupplierBundles();
  const [filterStatus, setFilterStatus] = useState<AuditCaseStatus | null>(null);

  const byStatus = useMemo(() => {
    const m: Record<AuditCaseStatus, number> = { queued: 0, in_progress: 0, awaiting_response: 0, closed: 0 };
    for (const c of audits) m[c.status] += 1;
    return m;
  }, [audits]);

  const filtered = filterStatus ? audits.filter((c) => c.status === filterStatus) : audits;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Queued" value={byStatus.queued} hint="Awaiting triage" />
        <MetricCard label="In progress" value={byStatus.in_progress} hint="Audit underway" />
        <MetricCard label="Awaiting response" value={byStatus.awaiting_response} hint="Supplier contacted" />
        <MetricCard label="Closed" value={byStatus.closed} hint="Resolved this quarter" />
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-5 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">Filter</span>
          <FilterChip active={filterStatus === null} onClick={() => setFilterStatus(null)}>
            All · {audits.length}
          </FilterChip>
          {ALL_STATUSES.map((s) => (
            <FilterChip
              key={s}
              active={filterStatus === s}
              onClick={() => setFilterStatus(s)}
            >
              {s.replace(/_/g, " ")} · {byStatus[s]}
            </FilterChip>
          ))}
          {filterStatus && (
            <button
              onClick={() => setFilterStatus(null)}
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-2 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-50"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-200/70 text-sm">
            <thead>
              <tr className="bg-ink-50/70 text-left text-[11px] uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3 font-medium">Case</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Commodity</th>
                <th className="px-4 py-3 font-medium">Area</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Triggering alerts</th>
                <th className="px-4 py-3 font-medium">Assigned</th>
                <th className="px-4 py-3 font-medium">Opened</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-6 text-center text-xs text-ink-500">
                    No audit cases match the current filter.
                  </td>
                </tr>
              )}
              {filtered.map((c) => {
                const b = bundles.find((x) => x.supplier.id === c.supplierId);
                if (!b) return null;
                return (
                  <tr key={c.id} className="hover:bg-ink-50/60">
                    <td className="px-4 py-3 font-mono text-xs text-ink-700">{c.id}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/suppliers/${b.supplier.id}`}
                        className="text-sm font-medium text-ink-900 hover:text-canopy-800"
                      >
                        {b.supplier.name}
                      </Link>
                      <p className="text-[11px] text-ink-500">{b.supplier.countryName} · {b.supplier.region}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-700">{COMMODITY_LABELS[b.supplier.commodity]}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-700">{formatHectares(b.boundary.areaHectares)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={c.priority <= 2 ? "escalate" : c.priority <= 3 ? "investigate" : "monitor"}>
                        P{c.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge classification={b.riskScore.classification} score={Math.round(b.riskScore.score)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.triggerAlertIds.map((aid) => (
                          <Link
                            key={aid}
                            href={`/alerts/${aid}`}
                            className="rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 font-mono text-[10px] text-ink-700 hover:bg-ink-100"
                          >
                            {aid}
                          </Link>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-700">{c.assignedTo}</td>
                    <td className="px-4 py-3 text-xs text-ink-700">{formatDate(c.openedAt)}</td>
                    <td className="px-4 py-3 text-xs text-ink-700">{formatDate(c.dueBy)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          c.status === "in_progress"
                            ? "canopy"
                            : c.status === "awaiting_response"
                              ? "monitor"
                              : c.status === "closed"
                                ? "low"
                                : "muted"
                        }
                      >
                        {c.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={c.status}
                        onChange={(e) => updateAuditStatus(c.id, e.target.value as AuditCaseStatus)}
                        className="h-7 rounded-md border border-ink-200 bg-white px-1.5 text-[11px]"
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize transition",
        active
          ? "border-canopy-300 bg-canopy-50 text-canopy-800"
          : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50",
      )}
    >
      {children}
    </button>
  );
}
