// Tolerant GeoJSON polygon extractor. Accepts FeatureCollection,
// Feature, Polygon, or MultiPolygon (first polygon used) and returns
// a SimplePolygon ready for boundary validation.

import type { SimplePolygon } from "@/lib/types";

export interface ParseResult {
  polygon: SimplePolygon | null;
  warnings: string[];
  errors: string[];
}

function isRing(value: unknown): value is [number, number][] {
  if (!Array.isArray(value) || value.length < 4) return false;
  for (const pt of value) {
    if (!Array.isArray(pt) || pt.length < 2) return false;
    if (typeof pt[0] !== "number" || typeof pt[1] !== "number") return false;
  }
  return true;
}

function closeRing(ring: [number, number][]): [number, number][] {
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, [first[0], first[1]]];
  }
  return ring;
}

function fromPolygonGeometry(g: any, warnings: string[]): SimplePolygon | null {
  if (g.type === "Polygon") {
    const outer = g.coordinates?.[0];
    if (!isRing(outer)) return null;
    return { type: "Polygon", coordinates: [closeRing(outer.map((p: number[]) => [p[0], p[1]] as [number, number]))] };
  }
  if (g.type === "MultiPolygon") {
    warnings.push("MultiPolygon detected — using the first polygon only. Split into separate supplier boundaries for full coverage.");
    const outer = g.coordinates?.[0]?.[0];
    if (!isRing(outer)) return null;
    return { type: "Polygon", coordinates: [closeRing(outer.map((p: number[]) => [p[0], p[1]] as [number, number]))] };
  }
  return null;
}

export function parseGeoJson(input: string): ParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  let data: any;
  try {
    data = JSON.parse(input);
  } catch (err) {
    return {
      polygon: null,
      warnings,
      errors: [`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  if (!data || typeof data !== "object") {
    return { polygon: null, warnings, errors: ["Empty or non-object payload."] };
  }

  // Try FeatureCollection → first polygon feature.
  if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
    if (data.features.length === 0) {
      return { polygon: null, warnings, errors: ["FeatureCollection contains no features."] };
    }
    if (data.features.length > 1) {
      warnings.push(`${data.features.length} features in collection — using the first polygon feature.`);
    }
    const polygonFeature = data.features.find((f: any) => f?.geometry?.type === "Polygon" || f?.geometry?.type === "MultiPolygon");
    if (!polygonFeature) {
      return { polygon: null, warnings, errors: ["FeatureCollection contains no Polygon or MultiPolygon features."] };
    }
    const polygon = fromPolygonGeometry(polygonFeature.geometry, warnings);
    return polygon
      ? { polygon, warnings, errors }
      : { polygon: null, warnings, errors: ["Polygon feature has invalid coordinates."] };
  }

  // Feature wrapping geometry
  if (data.type === "Feature" && data.geometry) {
    const polygon = fromPolygonGeometry(data.geometry, warnings);
    return polygon
      ? { polygon, warnings, errors }
      : { polygon: null, warnings, errors: ["Feature geometry is not a Polygon/MultiPolygon."] };
  }

  // Bare geometry
  if (data.type === "Polygon" || data.type === "MultiPolygon") {
    const polygon = fromPolygonGeometry(data, warnings);
    return polygon
      ? { polygon, warnings, errors }
      : { polygon: null, warnings, errors: ["Geometry has invalid coordinates."] };
  }

  return {
    polygon: null,
    warnings,
    errors: [`Unsupported GeoJSON type "${data.type}". Expected FeatureCollection, Feature, Polygon, or MultiPolygon.`],
  };
}
