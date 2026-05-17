import type {
  BoundaryQuality,
  BoundaryValidationIssue,
  SimplePolygon,
} from "@/lib/types";

// Shoelace formula on lng/lat — fine for small supplier plots in this MVP.
// In production use turf.area which accounts for spheroid curvature.
export function polygonAreaHectares(polygon: SimplePolygon): number {
  if (!polygon?.coordinates?.[0] || polygon.coordinates[0].length < 3) return 0;
  const ring = polygon.coordinates[0];
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  // Square degrees -> square meters at the equator -> hectares.
  const sqMeters = Math.abs(area / 2) * (111_320 ** 2);
  return Math.round(sqMeters / 10_000);
}

export function polygonCentroid(polygon: SimplePolygon): [number, number] {
  const ring = polygon.coordinates[0] ?? [];
  if (ring.length === 0) return [0, 0];
  let x = 0;
  let y = 0;
  for (const [lng, lat] of ring) {
    x += lng;
    y += lat;
  }
  return [x / ring.length, y / ring.length];
}

export interface BoundaryValidationResult {
  quality: BoundaryQuality;
  qualityScore: number;
  issues: BoundaryValidationIssue[];
  areaHectares: number;
}

export interface ValidationInputs {
  polygon: SimplePolygon | null;
  source: string;
  overlapsProtectedArea: boolean;
  duplicateOf?: string;
}

export function validateBoundary(input: ValidationInputs): BoundaryValidationResult {
  const issues: BoundaryValidationIssue[] = [];
  let score = 100;

  if (!input.polygon || input.polygon.coordinates[0]?.length < 4) {
    issues.push({
      code: "missing_polygon",
      severity: "error",
      message: "No polygon geometry provided.",
    });
    return {
      quality: "needs_review",
      qualityScore: 0,
      issues,
      areaHectares: 0,
    };
  }

  const ring = input.polygon.coordinates[0];
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = first[0] === last[0] && first[1] === last[1];
  if (!closed) {
    issues.push({
      code: "invalid_geometry",
      severity: "warning",
      message: "Polygon ring is not closed; auto-closing was applied.",
    });
    score -= 10;
  }

  if (ring.length < 6) {
    issues.push({
      code: "low_vertex_count",
      severity: "info",
      message: "Boundary defined by very few vertices; spatial precision may be limited.",
    });
    score -= 5;
  }

  const area = polygonAreaHectares(input.polygon);

  if (area < 0.5) {
    issues.push({
      code: "area_too_small",
      severity: "warning",
      message: "Polygon area is implausibly small (<0.5 ha) — likely a GPS point.",
    });
    score -= 20;
  }
  if (area > 100_000) {
    issues.push({
      code: "area_too_large",
      severity: "warning",
      message: "Polygon area exceeds 100,000 ha — likely covers multiple farms.",
    });
    score -= 25;
  }

  if (input.source === "gps_point_buffered") {
    issues.push({
      code: "point_only_submission",
      severity: "warning",
      message: "Original submission was a GPS point; boundary was buffered automatically.",
    });
    score -= 20;
  }

  if (input.overlapsProtectedArea) {
    issues.push({
      code: "protected_area_overlap",
      severity: "error",
      message: "Polygon overlaps a designated protected area or high conservation value zone.",
    });
    score -= 15;
  }

  if (input.duplicateOf) {
    issues.push({
      code: "duplicate_overlap",
      severity: "warning",
      message: `Polygon overlaps an existing supplier boundary (${input.duplicateOf}).`,
    });
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  let quality: BoundaryQuality;
  if (issues.some((i) => i.severity === "error")) quality = "needs_review";
  else if (score >= 85) quality = "high";
  else if (score >= 65) quality = "medium";
  else quality = "low";

  return { quality, qualityScore: score, issues, areaHectares: area };
}
