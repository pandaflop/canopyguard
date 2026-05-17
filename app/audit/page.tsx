"use client";

import { AuditQueueClient } from "@/components/AuditQueueClient";
import { useAudits } from "@/lib/case-store";

export default function AuditPage() {
  const audits = useAudits();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-canopy-700">Audit queue</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
          {audits.length} open cases
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Cases are opened automatically when a supplier risk score crosses the <em>investigate</em> band, or when a
          critical alert is generated. Use this queue to triage field and remote audits.
        </p>
      </div>
      <AuditQueueClient />
    </div>
  );
}
