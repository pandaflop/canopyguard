// Satellite analytics abstraction layer.
//
// Every function below returns deterministic mock data today. The
// signatures and return shapes match what a real Google Earth Engine /
// Sentinel Hub backend would produce. To go live, wrap each function in
// `async` and replace the body with one of:
//
//   - GEE Python service (Sentinel-2 SR, Sentinel-1 GRD, Hansen GFC,
//     JRC GFC, RADD alerts, GLAD-S2, WDPA protected areas).
//   - Sentinel Hub Statistical API for NDVI time series.
//   - Global Forest Watch tile/API endpoints for cross-checks.

import type {
  NDVIObservation,
  SARObservation,
  SatelliteMetric,
  SimplePolygon,
} from "@/lib/types";

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// Deterministic PRNG so demos stay stable across reloads.
// ---------------------------------------------------------------------------
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function polygonSeed(polygon: SimplePolygon): number {
  const flat = polygon.coordinates[0]
    .map((c) => `${c[0].toFixed(3)},${c[1].toFixed(3)}`)
    .join("|");
  return hashString(flat);
}

function isoDateAddDays(start: string, days: number): string {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthOf(iso: string): number {
  return parseInt(iso.slice(5, 7), 10) - 1;
}

function seasonalBaseline(monthIndex: number, baselineMean: number): number {
  const seasonal = 0.05 * Math.sin((monthIndex / 12) * Math.PI * 2 - Math.PI / 2);
  return Math.min(0.92, Math.max(0.15, baselineMean + seasonal));
}

export type ScenarioName =
  | "stable_forest"
  | "ndvi_drop_only"
  | "ndvi_and_sar"
  | "persistent_bare"
  | "post_2020_loss"
  | "replanting_recovery"
  | "poor_boundary";

export interface ScenarioHints {
  scenario?: ScenarioName;
  disturbanceStartIdx?: number;
}

// =============================================================================
// Public API
// =============================================================================

export function getSentinel2NDVITimeSeries(
  polygon: SimplePolygon,
  dateRange: DateRange,
  hints: ScenarioHints = {},
): NDVIObservation[] {
  // TODO(live): GEE call —
  //   ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
  //     .filterBounds(polygon).filterDate(start,end)
  //     .map(maskClouds).map(addNDVI).select("NDVI")
  //     .map(image => image.reduceRegion(ee.Reducer.mean(), polygon, 10))
  const rand = seededRandom(polygonSeed(polygon));
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  const days = Math.max(
    1,
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const stepDays = 14; // Sentinel-2 revisit ~5d; biweekly cloud-free composite.
  const out: NDVIObservation[] = [];
  const baselineMean = 0.62 + rand() * 0.12;
  const totalSteps = Math.floor(days / stepDays);
  const disturbanceIdx = hints.disturbanceStartIdx ?? Math.floor(totalSteps * 0.6);

  for (let i = 0, day = 0; day <= days; i++, day += stepDays) {
    const date = isoDateAddDays(dateRange.start, day);
    const seasonal = seasonalBaseline(monthOf(date), baselineMean);
    let ndvi = seasonal + (rand() - 0.5) * 0.04;

    switch (hints.scenario) {
      case "stable_forest":
        ndvi += 0.02;
        break;
      case "ndvi_drop_only":
        if (i >= disturbanceIdx) ndvi -= 0.18 - rand() * 0.04;
        break;
      case "ndvi_and_sar":
        if (i >= disturbanceIdx) ndvi -= 0.28 - rand() * 0.04;
        break;
      case "persistent_bare":
        if (i >= disturbanceIdx) ndvi = 0.16 + rand() * 0.04;
        break;
      case "post_2020_loss":
        if (i >= disturbanceIdx) ndvi -= 0.22 - rand() * 0.05;
        break;
      case "replanting_recovery":
        if (i >= disturbanceIdx && i < disturbanceIdx + 3) {
          ndvi = 0.2 + rand() * 0.05;
        } else if (i >= disturbanceIdx + 3) {
          ndvi = 0.35 + (i - disturbanceIdx - 3) * 0.03 + rand() * 0.03;
        }
        break;
    }

    ndvi = Math.min(0.94, Math.max(0.05, ndvi));
    out.push({
      date,
      ndvi: round(ndvi, 3),
      seasonalBaselineNdvi: round(seasonal, 3),
      cloudCoverPct: Math.round(rand() * 25),
    });
  }
  return out;
}

export function getSentinel1SARMetrics(
  polygon: SimplePolygon,
  dateRange: DateRange,
  hints: ScenarioHints = {},
): SARObservation[] {
  // TODO(live): GEE call —
  //   ee.ImageCollection("COPERNICUS/S1_GRD").filter(VV+IW)
  //     .filterBounds(polygon).filterDate(...).select("VV")
  //     .map(toLog).map(image => image.reduceRegion(...))
  const rand = seededRandom(polygonSeed(polygon) ^ 0x9e3779b9);
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  const days = Math.max(
    1,
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const stepDays = 12;
  const out: SARObservation[] = [];
  const baseline = -8.5 + rand() * 1.2;
  const totalSteps = Math.floor(days / stepDays);
  const disturbanceIdx = hints.disturbanceStartIdx ?? Math.floor(totalSteps * 0.6);

  for (let i = 0, day = 0; day <= days; i++, day += stepDays) {
    const date = isoDateAddDays(dateRange.start, day);
    let backscatter = baseline + (rand() - 0.5) * 0.6;
    let disturbProb = 0.05 + rand() * 0.05;

    if (hints.scenario === "ndvi_and_sar" && i >= disturbanceIdx) {
      backscatter += 3.2 + rand() * 0.6;
      disturbProb = 0.7 + rand() * 0.2;
    } else if (hints.scenario === "post_2020_loss" && i >= disturbanceIdx) {
      backscatter += 2.4;
      disturbProb = 0.55 + rand() * 0.15;
    } else if (hints.scenario === "persistent_bare" && i >= disturbanceIdx) {
      backscatter += 2.0;
      disturbProb = 0.4 + rand() * 0.1;
    }

    out.push({
      date,
      backscatterDb: round(backscatter, 2),
      baselineBackscatterDb: round(baseline, 2),
      disturbanceProbability: round(disturbProb, 2),
    });
  }
  return out;
}

export function generateBaselineComposite(
  polygon: SimplePolygon,
  year = 2020,
): { year: number; forestCoverPct: number; ndviMedian: number; tileUrl: string } {
  // TODO(live): GEE Hansen GFC or annual cloud-free Sentinel-2 composite.
  const rand = seededRandom(polygonSeed(polygon) ^ year);
  return {
    year,
    forestCoverPct: round(82 + rand() * 12, 1),
    ndviMedian: round(0.7 + rand() * 0.1, 3),
    tileUrl: `/mock-tiles/baseline-${year}.png`,
  };
}

export function generateCurrentComposite(
  polygon: SimplePolygon,
  hints: ScenarioHints = {},
): { year: number; forestCoverPct: number; ndviMedian: number; tileUrl: string } {
  const rand = seededRandom(polygonSeed(polygon) ^ 0xc0ffee);
  let cover = 80 + rand() * 12;
  if (hints.scenario === "post_2020_loss") cover -= 18 + rand() * 6;
  if (hints.scenario === "ndvi_and_sar") cover -= 22 + rand() * 6;
  if (hints.scenario === "persistent_bare") cover -= 28 + rand() * 8;
  if (hints.scenario === "replanting_recovery") cover -= 6 + rand() * 4;
  return {
    year: new Date().getUTCFullYear(),
    forestCoverPct: round(Math.max(20, cover), 1),
    ndviMedian: round(0.55 + rand() * 0.15, 3),
    tileUrl: `/mock-tiles/current.png`,
  };
}

export function calculateNDVIAnomaly(
  currentNDVI: number,
  seasonalBaseline: number,
): { anomaly: number; anomalyPct: number; isSignificant: boolean } {
  const anomaly = currentNDVI - seasonalBaseline;
  const anomalyPct = (anomaly / seasonalBaseline) * 100;
  return {
    anomaly: round(anomaly, 3),
    anomalyPct: round(anomalyPct, 1),
    isSignificant: anomalyPct <= -15,
  };
}

export function detectSARCanopyDisturbance(
  currentSAR: SARObservation,
  baselineSAR: SARObservation,
): { delta: number; level: "none" | "weak" | "moderate" | "strong" } {
  const delta = currentSAR.backscatterDb - baselineSAR.backscatterDb;
  let level: "none" | "weak" | "moderate" | "strong" = "none";
  // VV backscatter increase in moist tropical forest commonly indicates
  // canopy removal. Thresholds in production are calibrated per biome.
  if (delta > 3) level = "strong";
  else if (delta > 2) level = "moderate";
  else if (delta > 1) level = "weak";
  return { delta: round(delta, 2), level };
}

export function detectPersistentBareSoil(
  timeSeries: NDVIObservation[],
  monthsThreshold = 3,
): { months: number; isPersistent: boolean; lastBareDate: string | null } {
  const BARE_NDVI = 0.25;
  const byMonth = new Map<string, number[]>();
  for (const obs of timeSeries) {
    const key = obs.date.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(obs.ndvi);
  }
  const monthsSorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  let streak = 0;
  let maxStreak = 0;
  let lastBareDate: string | null = null;
  for (const [month, values] of monthsSorted) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean < BARE_NDVI) {
      streak += 1;
      lastBareDate = `${month}-15`;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
    }
  }
  return {
    months: maxStreak,
    isPersistent: maxStreak >= monthsThreshold,
    lastBareDate,
  };
}

export function compare2020BaselineToCurrent(
  polygon: SimplePolygon,
  hints: ScenarioHints = {},
): {
  baselineForestCoverPct: number;
  currentForestCoverPct: number;
  forestLossHectares: number;
  forestLossPct: number;
  signalConfidence: number;
} {
  const baseline = generateBaselineComposite(polygon, 2020);
  const current = generateCurrentComposite(polygon, hints);
  const lossPct = Math.max(0, baseline.forestCoverPct - current.forestCoverPct);
  return {
    baselineForestCoverPct: baseline.forestCoverPct,
    currentForestCoverPct: current.forestCoverPct,
    forestLossHectares: 0, // multiplied by area outside
    forestLossPct: round(lossPct, 1),
    signalConfidence: Math.min(1, lossPct / 25),
  };
}

export function crossCheckExternalForestAlerts(
  polygon: SimplePolygon,
  dateRange: DateRange,
  hints: ScenarioHints = {},
): { source: string; alertCount: number; lastAlertDate: string | null }[] {
  // TODO(live): query GFW / RADD / GLAD-S2 alert tiles intersected with polygon.
  const rand = seededRandom(polygonSeed(polygon) ^ 0xfeedf00d);
  const sources = ["RADD", "GLAD-S2", "GFW Integrated"];
  return sources.map((source) => {
    const triggers =
      hints.scenario === "ndvi_and_sar" ||
      hints.scenario === "post_2020_loss" ||
      hints.scenario === "persistent_bare";
    const alertCount = triggers ? Math.floor(2 + rand() * 6) : Math.floor(rand() * 1.2);
    return {
      source,
      alertCount,
      lastAlertDate:
        alertCount > 0
          ? isoDateAddDays(dateRange.end, -Math.floor(rand() * 30))
          : null,
    };
  });
}

export function buildSatelliteMetric(
  supplierId: string,
  polygon: SimplePolygon,
  areaHectares: number,
  dateRange: DateRange,
  hints: ScenarioHints = {},
): SatelliteMetric {
  const comparison = compare2020BaselineToCurrent(polygon, hints);
  const ndvi = getSentinel2NDVITimeSeries(polygon, dateRange, hints);
  const persistence = detectPersistentBareSoil(ndvi);
  const external = crossCheckExternalForestAlerts(polygon, dateRange, hints);
  return {
    supplierId,
    baselineYear: 2020,
    baselineForestCoverPct: comparison.baselineForestCoverPct,
    currentForestCoverPct: comparison.currentForestCoverPct,
    forestLossHectares: round((comparison.forestLossPct / 100) * areaHectares, 1),
    bareSoilMonths: persistence.months,
    externalAlertMatchCount: external.reduce((sum, e) => sum + e.alertCount, 0),
    lastObservationDate: ndvi[ndvi.length - 1]?.date ?? dateRange.end,
  };
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
