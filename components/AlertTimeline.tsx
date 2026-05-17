import { Card, CardHeader } from "@/components/ui/Card";
import type { AlertDecisionEntry } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CircleDot } from "lucide-react";

export function AlertTimeline({ entries }: { entries: AlertDecisionEntry[] }) {
  return (
    <Card>
      <CardHeader
        title="Decision log"
        subtitle="Auditable trail of system detections and human reviews"
      />
      <ol className="relative space-y-4 border-l border-ink-200 pl-5">
        {entries.map((e, idx) => (
          <li key={idx} className="relative">
            <span className="absolute -left-[26px] top-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-ink-200 bg-white">
              <CircleDot className="h-2.5 w-2.5 text-canopy-600" />
            </span>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-ink-900">{e.action}</p>
              <p className="font-mono text-[11px] text-ink-500">{formatDate(e.date)}</p>
            </div>
            <p className="mt-0.5 text-[11px] text-ink-500">{e.actor}</p>
            {e.note && <p className="mt-1 text-xs text-ink-600">{e.note}</p>}
          </li>
        ))}
      </ol>
    </Card>
  );
}
