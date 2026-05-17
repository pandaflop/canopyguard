// Audit economics model.
//
// Models the annual procurement-audit cost difference between:
//   - Baseline: every supplier physically audited annually
//   - With CanopyGuard: audit cadence shifts by risk band, with a
//     small per-supplier monitoring fee
//
// Defensible, parameterised, and visible — the underlying assumptions
// are exported so they can be displayed in a tooltip.

import type { SupplierBundle } from "@/lib/mock-data";

export const AUDIT_ECONOMICS_ASSUMPTIONS = {
  // Typical mid-tier third-party verification audit (RSPO / RA / FSC),
  // averaged across travel, agency fees, and on-site days.
  costPerPhysicalAuditUsd: 22_000,
  // Baseline cadence in absence of satellite evidence.
  baselineAuditsPerYear: 1,
  // With satellite evidence, low-risk suppliers can shift to every 3rd year.
  lowRiskAuditsPerYear: 1 / 3,
  // Monitor-band suppliers can move to a biennial cycle.
  monitorAuditsPerYear: 1 / 2,
  // Investigate-band stays annual.
  investigateAuditsPerYear: 1,
  // Escalate-band typically requires an extra unscheduled audit (~50% more).
  escalateAuditsPerYear: 1.5,
  // Annual per-supplier cost for satellite monitoring (license + tile fees).
  monitoringCostPerSupplierUsd: 500,
};

export interface AuditEconomicsLineItem {
  label: string;
  supplierCount: number;
  baselineAnnualCostUsd: number;
  withCanopyguardAnnualCostUsd: number;
  annualSavingsUsd: number;
}

export interface AuditEconomicsResult {
  lines: AuditEconomicsLineItem[];
  totalBaselineUsd: number;
  totalWithCanopyguardUsd: number;
  monitoringServiceCostUsd: number;
  netAnnualSavingsUsd: number;
}

export function computeAuditEconomics(
  bundles: SupplierBundle[],
  // Optional projection: scale the savings model up to `projectedSize`
  // suppliers while preserving the current portfolio's risk-band proportions.
  // If omitted, returns the actual figures for the live portfolio.
  projectedSize?: number,
): AuditEconomicsResult {
  const A = AUDIT_ECONOMICS_ASSUMPTIONS;
  const cost = A.costPerPhysicalAuditUsd;

  // Live portfolio band counts.
  const actual = {
    low: bundles.filter((b) => b.riskScore.classification === "low").length,
    monitor: bundles.filter((b) => b.riskScore.classification === "monitor").length,
    investigate: bundles.filter((b) => b.riskScore.classification === "investigate").length,
    escalate: bundles.filter((b) => b.riskScore.classification === "escalate").length,
  };

  // If projecting, scale each band proportionally to projectedSize.
  let bands = actual;
  if (projectedSize && projectedSize > 0 && bundles.length > 0) {
    const ratio = projectedSize / bundles.length;
    bands = {
      low: actual.low * ratio,
      monitor: actual.monitor * ratio,
      investigate: actual.investigate * ratio,
      escalate: actual.escalate * ratio,
    };
  }

  const line = (
    label: string,
    n: number,
    withFreq: number,
  ): AuditEconomicsLineItem => {
    const baseline = n * A.baselineAuditsPerYear * cost;
    const withCg = n * withFreq * cost;
    return {
      label,
      supplierCount: Math.round(n),
      baselineAnnualCostUsd: baseline,
      withCanopyguardAnnualCostUsd: withCg,
      annualSavingsUsd: baseline - withCg,
    };
  };

  const lines: AuditEconomicsLineItem[] = [
    line("Low risk — shift to 3-year audit cycle", bands.low, A.lowRiskAuditsPerYear),
    line("Monitor — shift to 2-year audit cycle", bands.monitor, A.monitorAuditsPerYear),
    line("Investigate — no change (annual audit retained)", bands.investigate, A.investigateAuditsPerYear),
    line("Escalate — adds ~50% supplemental audits", bands.escalate, A.escalateAuditsPerYear),
  ];

  const effectivePortfolioSize = projectedSize ?? bundles.length;
  const totalBaseline = lines.reduce((s, l) => s + l.baselineAnnualCostUsd, 0);
  const totalWithCg = lines.reduce((s, l) => s + l.withCanopyguardAnnualCostUsd, 0);
  const monitoringServiceCost = effectivePortfolioSize * A.monitoringCostPerSupplierUsd;
  const netSavings = totalBaseline - totalWithCg - monitoringServiceCost;

  return {
    lines,
    totalBaselineUsd: totalBaseline,
    totalWithCanopyguardUsd: totalWithCg,
    monitoringServiceCostUsd: monitoringServiceCost,
    netAnnualSavingsUsd: netSavings,
  };
}
