"use client";

// Replaces the hardcoded "$1.4M annual savings" tile with a real
// computed figure that scales with the supplier portfolio, plus a
// projection control to show what the model looks like at full CPG scale.

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Info } from "lucide-react";
import {
  AUDIT_ECONOMICS_ASSUMPTIONS,
  computeAuditEconomics,
} from "@/lib/audit-economics";
import type { SupplierBundle } from "@/lib/mock-data";
import { formatUsd } from "@/lib/utils";

const PRESET_SIZES = [10, 50, 100, 500, 1_000, 2_500, 5_000];

export function AuditEconomicsCard({ bundles }: { bundles: SupplierBundle[] }) {
  const actualSize = bundles.length;
  const [projectedSize, setProjectedSize] = useState<number>(actualSize);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const economics = computeAuditEconomics(bundles, projectedSize);
  const A = AUDIT_ECONOMICS_ASSUMPTIONS;
  const isProjected = projectedSize !== actualSize;

  return (
    <Card>
      <CardHeader
        title="Audit economics"
        subtitle="Annual procurement-audit savings vs blanket physical audit baseline"
        action={
          <button
            onClick={() => setShowAssumptions((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-2 py-1 text-[11px] font-medium text-ink-600 hover:bg-ink-50"
          >
            <Info className="h-3 w-3" /> Assumptions
          </button>
        }
      />

      {/* Portfolio-scale projection control */}
      <div className="mb-4 rounded-md border border-canopy-100 bg-canopy-50/40 p-3">
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor="projection-size" className="text-[11px] font-medium uppercase tracking-wider text-canopy-800">
            Project to portfolio of
          </label>
          <span className="font-mono text-sm font-semibold text-canopy-900">
            {projectedSize.toLocaleString()} suppliers
            {!isProjected && <span className="ml-1 text-[10px] font-normal text-canopy-700">(current)</span>}
          </span>
        </div>
        <input
          id="projection-size"
          type="range"
          min={actualSize}
          max={5000}
          step={actualSize}
          value={projectedSize}
          onChange={(e) => setProjectedSize(parseInt(e.target.value, 10))}
          className="w-full accent-canopy-700"
        />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-ink-500">Quick set:</span>
          {PRESET_SIZES.filter((s) => s >= actualSize).map((s) => (
            <button
              key={s}
              onClick={() => setProjectedSize(s)}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                projectedSize === s
                  ? "border-canopy-300 bg-canopy-100 text-canopy-900"
                  : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
              }`}
            >
              {s.toLocaleString()}
            </button>
          ))}
          {isProjected && (
            <button
              onClick={() => setProjectedSize(actualSize)}
              className="ml-auto rounded-full border border-ink-200 bg-white px-2 py-0.5 text-[10px] font-medium text-ink-700 hover:bg-ink-50"
            >
              Reset to actual
            </button>
          )}
        </div>
        {isProjected && (
          <p className="mt-2 text-[10px] leading-snug text-ink-500">
            Projection preserves the current portfolio&apos;s risk-band proportions and scales linearly. Useful for
            estimating savings at full CPG procurement scale.
          </p>
        )}
      </div>

      <div className="space-y-2 text-sm">
        {economics.lines.map((line) => (
          <div
            key={line.label}
            className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3 border-b border-dashed border-ink-100 pb-1.5"
          >
            <span className="text-ink-700">{line.label}</span>
            <span className="font-mono text-[11px] text-ink-500">{line.supplierCount} suppliers</span>
            <span
              className={`font-mono text-xs ${
                line.annualSavingsUsd > 0
                  ? "text-canopy-800"
                  : line.annualSavingsUsd < 0
                    ? "text-rose-700"
                    : "text-ink-500"
              }`}
            >
              {line.annualSavingsUsd >= 0 ? "+" : ""}
              {formatUsd(line.annualSavingsUsd)}
            </span>
          </div>
        ))}

        <div className="grid grid-cols-[1fr_auto] items-baseline gap-3 pt-1 text-xs">
          <span className="text-ink-700">Baseline audit spend (1 audit/yr × all suppliers)</span>
          <span className="font-mono text-ink-900">{formatUsd(economics.totalBaselineUsd)}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-baseline gap-3 text-xs">
          <span className="text-ink-700">With CanopyGuard (cadence shifted by risk band)</span>
          <span className="font-mono text-ink-900">{formatUsd(economics.totalWithCanopyguardUsd)}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-baseline gap-3 text-xs">
          <span className="text-ink-700">
            Satellite monitoring service ({projectedSize.toLocaleString()} suppliers × $
            {A.monitoringCostPerSupplierUsd}/yr)
          </span>
          <span className="font-mono text-rose-700">-{formatUsd(economics.monitoringServiceCostUsd)}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto] items-baseline gap-3 border-t-2 border-ink-200 pt-3">
          <span className="font-medium text-ink-900">
            Estimated net annual savings
            {isProjected && (
              <span className="ml-1 text-[11px] font-normal text-ink-500">
                @ {projectedSize.toLocaleString()} suppliers
              </span>
            )}
          </span>
          <span className="font-mono font-semibold text-canopy-800">
            {formatUsd(economics.netAnnualSavingsUsd)}
          </span>
        </div>
      </div>

      {showAssumptions && (
        <div className="mt-4 rounded-md border border-ink-200 bg-ink-50/60 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">
            Model assumptions
          </p>
          <ul className="mt-1.5 space-y-1 text-[11px] text-ink-700">
            <li>Avg cost per physical third-party audit: <strong>${A.costPerPhysicalAuditUsd.toLocaleString()}</strong></li>
            <li>Baseline cadence (no satellite evidence): <strong>{A.baselineAuditsPerYear} audit/year</strong></li>
            <li>Low-risk cadence: <strong>{A.lowRiskAuditsPerYear.toFixed(2)} audits/year</strong> (3-year cycle)</li>
            <li>Monitor cadence: <strong>{A.monitorAuditsPerYear.toFixed(2)} audits/year</strong> (2-year cycle)</li>
            <li>Investigate cadence: <strong>{A.investigateAuditsPerYear} audit/year</strong> (unchanged)</li>
            <li>Escalate cadence: <strong>{A.escalateAuditsPerYear} audits/year</strong> (supplemental on top of annual)</li>
            <li>Per-supplier monitoring fee: <strong>${A.monitoringCostPerSupplierUsd}/year</strong></li>
          </ul>
          <p className="mt-2 text-[10px] leading-snug text-ink-500">
            Cost-per-audit drawn from published RSPO / Rainforest Alliance / FSC verification rates for mid-size
            plantations. Cadence assumptions reflect typical EUDR risk-based audit programs. Actual savings vary by
            commodity, country, and incumbent audit cycle. Projection assumes the new suppliers share the current
            portfolio&apos;s risk distribution; in practice a larger portfolio is usually more low-risk-heavy than this
            demo, so projections shown are conservative.
          </p>
        </div>
      )}
    </Card>
  );
}
