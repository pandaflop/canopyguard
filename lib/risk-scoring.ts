import {
  RISK_BANDS,
  type CommodityRiskProfile,
  type CountryRiskProfile,
  type RiskClassification,
  type RiskScore,
  type RiskScoreComponent,
  type SatelliteMetric,
  type SupplierBoundary,
} from "@/lib/types";

export const RISK_MODEL_VERSION = "cg-risk-1.0";

// Maximum points each component can contribute. Sums to 100.
export const RISK_WEIGHTS: Record<RiskScoreComponent["key"], number> = {
  ndvi_anomaly: 20,
  sar_disturbance: 20,
  post_2020_loss: 25,
  protected_overlap: 10,
  commodity_risk: 10,
  country_risk: 5,
  data_quality: 10,
};

export function classifyRisk(score: number): RiskClassification {
  for (const band of RISK_BANDS) {
    if (score <= band.max) return band.classification;
  }
  return "escalate";
}

export interface RiskInputs {
  supplierId: string;
  satellite: SatelliteMetric;
  boundary: SupplierBoundary;
  commodityProfile: CommodityRiskProfile;
  countryProfile: CountryRiskProfile;
  ndviAnomalyPct: number; // most recent same-season anomaly (negative = loss)
  sarDisturbanceLevel: "none" | "weak" | "moderate" | "strong";
  externalAlertCount: number;
}

export function computeRiskScore(input: RiskInputs): RiskScore {
  const components: RiskScoreComponent[] = [];

  // 1. NDVI anomaly (20). Drop of -30% saturates the signal.
  {
    const drop = Math.max(0, -input.ndviAnomalyPct);
    const raw = Math.min(1, drop / 30);
    components.push({
      key: "ndvi_anomaly",
      label: "Recent NDVI anomaly vs seasonal baseline",
      weight: RISK_WEIGHTS.ndvi_anomaly,
      rawSignal: raw,
      contribution: round(raw * RISK_WEIGHTS.ndvi_anomaly, 1),
      rationale:
        drop > 0
          ? `Current NDVI is ${drop.toFixed(1)}% below same-season baseline.`
          : "No significant NDVI decline vs same-season baseline.",
    });
  }

  // 2. SAR disturbance (20). Strong = full weight.
  {
    const map = { none: 0, weak: 0.3, moderate: 0.65, strong: 1 } as const;
    const raw = map[input.sarDisturbanceLevel];
    components.push({
      key: "sar_disturbance",
      label: "SAR canopy disturbance confirmation",
      weight: RISK_WEIGHTS.sar_disturbance,
      rawSignal: raw,
      contribution: round(raw * RISK_WEIGHTS.sar_disturbance, 1),
      rationale:
        raw === 0
          ? "No SAR evidence of structural canopy disturbance."
          : `Sentinel-1 SAR backscatter shift indicates ${input.sarDisturbanceLevel} canopy disturbance signal.`,
    });
  }

  // 3. Post-2020 forest loss (25). 20% of area lost saturates.
  {
    const lossPct = Math.max(
      0,
      input.satellite.baselineForestCoverPct - input.satellite.currentForestCoverPct,
    );
    const raw = Math.min(1, lossPct / 20);
    // Boost confidence when external alert systems concur.
    const concurrence = input.externalAlertCount > 0 ? Math.min(1.15, 1 + input.externalAlertCount * 0.03) : 1;
    const adjusted = Math.min(1, raw * concurrence);
    components.push({
      key: "post_2020_loss",
      label: "Likely post-2020 forest loss",
      weight: RISK_WEIGHTS.post_2020_loss,
      rawSignal: adjusted,
      contribution: round(adjusted * RISK_WEIGHTS.post_2020_loss, 1),
      rationale:
        lossPct > 0.5
          ? `Forest cover declined from ${input.satellite.baselineForestCoverPct.toFixed(1)}% (2020 baseline) to ${input.satellite.currentForestCoverPct.toFixed(1)}%${input.externalAlertCount > 0 ? ` with ${input.externalAlertCount} concurring external alert(s).` : "."}`
          : "No detected post-2020 forest-loss signal based on available public satellite data.",
    });
  }

  // 4. Protected area / HCV overlap (10).
  {
    const overlap = input.boundary.protectedAreaOverlapHectares;
    const raw = overlap > 0 ? Math.min(1, overlap / Math.max(1, input.boundary.areaHectares * 0.05)) : 0;
    components.push({
      key: "protected_overlap",
      label: "Protected area / HCV overlap",
      weight: RISK_WEIGHTS.protected_overlap,
      rawSignal: raw,
      contribution: round(raw * RISK_WEIGHTS.protected_overlap, 1),
      rationale:
        overlap > 0
          ? `${overlap.toFixed(0)} ha overlap with a protected or HCV area.`
          : "Boundary does not intersect known protected or HCV areas.",
    });
  }

  // 5. Commodity inherent risk (10).
  {
    const raw = input.commodityProfile.inherentRisk / 100;
    components.push({
      key: "commodity_risk",
      label: "Commodity inherent deforestation risk",
      weight: RISK_WEIGHTS.commodity_risk,
      rawSignal: raw,
      contribution: round(raw * RISK_WEIGHTS.commodity_risk, 1),
      rationale: `${input.commodityProfile.commodity} carries an inherent risk weight of ${input.commodityProfile.inherentRisk}/100 driven by ${input.commodityProfile.primaryDriver}.`,
    });
  }

  // 6. Country governance risk (5). Higher governance => lower risk.
  {
    const raw = (input.countryProfile.baselineRisk * 0.6 + (100 - input.countryProfile.governanceScore) * 0.4) / 100;
    components.push({
      key: "country_risk",
      label: "Country / region governance context",
      weight: RISK_WEIGHTS.country_risk,
      rawSignal: raw,
      contribution: round(raw * RISK_WEIGHTS.country_risk, 1),
      rationale: `${input.countryProfile.countryName} baseline risk ${input.countryProfile.baselineRisk}, governance score ${input.countryProfile.governanceScore}. ${input.countryProfile.notes}`,
    });
  }

  // 7. Supplier data / boundary quality (10). Low quality = higher uncertainty risk.
  {
    const raw = (100 - input.boundary.qualityScore) / 100;
    components.push({
      key: "data_quality",
      label: "Supplier data & boundary quality",
      weight: RISK_WEIGHTS.data_quality,
      rawSignal: raw,
      contribution: round(raw * RISK_WEIGHTS.data_quality, 1),
      rationale:
        input.boundary.qualityScore >= 85
          ? "High-quality boundary data — risk signal can be trusted with low caveat."
          : `Boundary quality score ${input.boundary.qualityScore}/100 — risk signal carries elevated uncertainty.`,
    });
  }

  const score = round(
    components.reduce((sum, c) => sum + c.contribution, 0),
    1,
  );

  return {
    supplierId: input.supplierId,
    score,
    classification: classifyRisk(score),
    components,
    computedAt: new Date().toISOString(),
    modelVersion: RISK_MODEL_VERSION,
  };
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
