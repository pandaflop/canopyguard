import { Card, CardHeader } from "@/components/ui/Card";
import { RiskBadge } from "@/components/RiskBadge";
import type { RiskScore } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RiskScoreBreakdown({ score }: { score: RiskScore }) {
  return (
    <Card>
      <CardHeader
        title="Risk score breakdown"
        subtitle={`Model ${score.modelVersion} · computed ${new Date(score.computedAt).toLocaleString()}`}
        action={<RiskBadge classification={score.classification} score={Math.round(score.score)} />}
      />

      <div className="mb-5 flex items-end gap-4">
        <div className="text-4xl font-semibold tracking-tight text-ink-900">
          {Math.round(score.score)}
          <span className="text-base font-normal text-ink-400">/100</span>
        </div>
        <div className="flex-1">
          <ScoreBar score={score.score} />
          <div className="mt-1 flex justify-between text-[10px] font-medium uppercase tracking-wider text-ink-500">
            <span>Low</span>
            <span>Monitor</span>
            <span>Investigate</span>
            <span>Escalate</span>
          </div>
        </div>
      </div>

      <ul className="space-y-3">
        {score.components.map((c) => {
          const pct = Math.round((c.contribution / c.weight) * 100);
          return (
            <li key={c.key}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-ink-900">{c.label}</p>
                <p className="font-mono text-xs text-ink-700">
                  {c.contribution.toFixed(1)}<span className="text-ink-400">/{c.weight}</span>
                </p>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    pct >= 75
                      ? "bg-rose-500"
                      : pct >= 50
                        ? "bg-orange-500"
                        : pct >= 25
                          ? "bg-amber-500"
                          : "bg-canopy-500",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-ink-500">{c.rationale}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 opacity-30" />
      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 via-amber-600 to-rose-600" style={{ width: `${pct}%` }} />
      <div
        className="absolute top-0 h-2 w-0.5 rounded-full bg-ink-900"
        style={{ left: `calc(${pct}% - 1px)` }}
      />
    </div>
  );
}
