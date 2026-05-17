// Scenario-templated disturbance polygon synthesizer.
//
// Each scenario produces a *characteristic visual signature* — what real
// canopy disturbance looks like for that pattern of loss. The shape, count,
// and position of the patches all vary by scenario, but are deterministic
// from the supplier ID so the same supplier always renders the same pattern.
//
// IMPORTANT: This is synthetic illustrative geometry, not a real change-detection
// mask. The total area is anchored to the real `affected_area_percentage`,
// but the spatial location of disturbance requires a live satellite raster
// pipeline (Earth Engine / Sentinel Hub) to be accurate.

import type { ScenarioName } from "@/lib/satellite";
import type { SimplePolygon } from "@/lib/types";

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

interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  centerLng: number;
  centerLat: number;
  width: number;
  height: number;
}

function boundaryBbox(polygon: SimplePolygon): Bbox {
  const ring = polygon.coordinates[0];
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  return {
    minLng,
    minLat,
    maxLng,
    maxLat,
    centerLng: (minLng + maxLng) / 2,
    centerLat: (minLat + maxLat) / 2,
    width: maxLng - minLng,
    height: maxLat - minLat,
  };
}

// Build a roughly circular polygon at a center with a given radius and jitter.
function blob(
  centerLng: number,
  centerLat: number,
  radiusLng: number,
  radiusLat: number,
  rand: () => number,
  vertices = 12,
  jitter = 0.25,
): [number, number][] {
  const points: [number, number][] = [];
  const rotation = rand() * Math.PI * 2;
  for (let i = 0; i < vertices; i++) {
    const t = i / vertices;
    const angle = t * Math.PI * 2 + rotation;
    const noise =
      Math.sin(angle * 3 + rand() * 6) * 0.5 +
      Math.sin(angle * 2 + rand() * 6) * 0.4 +
      (rand() - 0.5) * 0.6;
    const rx = radiusLng * (1 + noise * jitter);
    const ry = radiusLat * (1 + noise * jitter);
    points.push([centerLng + Math.cos(angle) * rx, centerLat + Math.sin(angle) * ry]);
  }
  points.push([points[0][0], points[0][1]]);
  return points;
}

export interface DisturbancePatch {
  ring: [number, number][];
  // intensity 0..1 — drives fill opacity per patch
  intensity: number;
}

export interface DisturbanceResult {
  patches: DisturbancePatch[];
  pattern: "contiguous" | "edge_strip" | "scattered" | "grid" | "diffuse" | "hatched_unknown" | "none";
  label: string;
}

// =============================================================================
// Public API
// =============================================================================
export function buildDisturbancePatches(
  polygon: SimplePolygon,
  scenario: ScenarioName,
  affectedFraction: number, // 0..1
  supplierId: string,
): DisturbanceResult {
  const bbox = boundaryBbox(polygon);
  const rand = seededRandom(hashString(`${supplierId}|${scenario}`));
  const frac = Math.max(0, Math.min(1, affectedFraction));

  switch (scenario) {
    case "stable_forest":
      return { patches: [], pattern: "none", label: "No disturbance detected" };

    case "poor_boundary":
      // Hatched whole-boundary overlay — "we can't tell where, data quality issue".
      return {
        patches: [{ ring: polygon.coordinates[0], intensity: 0.35 }],
        pattern: "hatched_unknown",
        label: "Boundary quality prevents disturbance localization",
      };

    case "ndvi_and_sar": {
      // Bulldozer clearing — 1-2 large contiguous patches.
      const r = Math.sqrt(frac) * 0.55;
      const ox = (rand() - 0.5) * bbox.width * 0.3;
      const oy = (rand() - 0.5) * bbox.height * 0.3;
      const patches: DisturbancePatch[] = [
        {
          ring: blob(bbox.centerLng + ox, bbox.centerLat + oy, bbox.width * r, bbox.height * r, rand, 14, 0.3),
          intensity: 0.7,
        },
      ];
      if (frac > 0.2) {
        patches.push({
          ring: blob(
            bbox.centerLng - ox * 1.3,
            bbox.centerLat - oy * 1.3,
            bbox.width * r * 0.45,
            bbox.height * r * 0.45,
            rand,
            12,
            0.35,
          ),
          intensity: 0.55,
        });
      }
      return { patches, pattern: "contiguous", label: "Bulldozer-pattern clearing" };
    }

    case "post_2020_loss": {
      // Edge-adjacent strip — progressive expansion from one side.
      const edge = ["N", "S", "E", "W"][Math.floor(rand() * 4)];
      const stripFrac = Math.sqrt(frac);
      let cx = bbox.centerLng;
      let cy = bbox.centerLat;
      let rx = bbox.width * 0.5;
      let ry = bbox.height * 0.5;
      switch (edge) {
        case "N": cy = bbox.maxLat - bbox.height * stripFrac * 0.5; ry = bbox.height * stripFrac * 0.5; break;
        case "S": cy = bbox.minLat + bbox.height * stripFrac * 0.5; ry = bbox.height * stripFrac * 0.5; break;
        case "E": cx = bbox.maxLng - bbox.width * stripFrac * 0.5; rx = bbox.width * stripFrac * 0.5; break;
        case "W": cx = bbox.minLng + bbox.width * stripFrac * 0.5; rx = bbox.width * stripFrac * 0.5; break;
      }
      return {
        patches: [{ ring: blob(cx, cy, rx * 0.95, ry * 0.95, rand, 16, 0.22), intensity: 0.65 }],
        pattern: "edge_strip",
        label: "Progressive clearing from boundary edge",
      };
    }

    case "persistent_bare": {
      // Wide diffuse area — sustained clearing.
      const r = Math.sqrt(frac) * 0.7;
      return {
        patches: [{
          ring: blob(bbox.centerLng, bbox.centerLat, bbox.width * r, bbox.height * r, rand, 18, 0.4),
          intensity: 0.55,
        }],
        pattern: "diffuse",
        label: "Sustained bare-soil signature",
      };
    }

    case "ndvi_drop_only": {
      // Scattered patches — selective harvesting / smallholder encroachment.
      const patchCount = Math.max(3, Math.round(4 + frac * 6));
      const totalRadius = Math.sqrt(frac / patchCount) * 0.4;
      const patches: DisturbancePatch[] = [];
      for (let i = 0; i < patchCount; i++) {
        const px = bbox.minLng + rand() * bbox.width;
        const py = bbox.minLat + rand() * bbox.height;
        const sizeJitter = 0.6 + rand() * 0.8;
        patches.push({
          ring: blob(
            px,
            py,
            bbox.width * totalRadius * sizeJitter,
            bbox.height * totalRadius * sizeJitter,
            rand,
            8,
            0.45,
          ),
          intensity: 0.45 + rand() * 0.25,
        });
      }
      return { patches, pattern: "scattered", label: "Scattered selective-harvest pattern" };
    }

    case "replanting_recovery": {
      // Regular grid pattern — organized plantation rows replanted.
      const cols = 4;
      const rows = 3;
      const patches: DisturbancePatch[] = [];
      const cellW = bbox.width / (cols + 1);
      const cellH = bbox.height / (rows + 1);
      const fill = Math.min(1, frac * 2.5); // proportion of cells filled
      let cellsToFill = Math.round(cols * rows * fill);
      const order: number[] = Array.from({ length: cols * rows }, (_, i) => i);
      // Shuffle deterministically.
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      for (const idx of order) {
        if (cellsToFill <= 0) break;
        cellsToFill--;
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = bbox.minLng + (col + 1) * cellW;
        const cy = bbox.minLat + (row + 1) * cellH;
        patches.push({
          ring: blob(cx, cy, cellW * 0.32, cellH * 0.32, rand, 8, 0.15),
          intensity: 0.35,
        });
      }
      return { patches, pattern: "grid", label: "Replanting recovery — organized rows" };
    }
  }
}
