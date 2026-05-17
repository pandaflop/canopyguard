// Procedural polygon generator for seed supplier boundaries.
//
// In production, supplier boundaries come from real geometry (uploaded
// GeoJSON, Shapefile, KML, or hand-drawn). The seed dataset uses these
// generators to produce *plausible-looking* polygons that vary by
// commodity, since real plantation boundary data isn't publicly
// distributable for most named producers.
//
// Every generator is deterministic from the supplier ID, so the same
// supplier always renders the same shape across reloads.

import type { CommodityType, SimplePolygon } from "@/lib/types";

// ---------------------------------------------------------------------------
// Deterministic PRNG — same one used by the satellite mock so seeds chain.
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

// ---------------------------------------------------------------------------
// Shape templates per commodity. Each one is calibrated to roughly match
// the real-world boundary signature for that supply chain.
// ---------------------------------------------------------------------------

interface ShapeTemplate {
  vertices: number;          // approx vertex count
  aspectRatio: number;       // 1 = circle, >1 = elongated east-west
  jitter: number;            // 0 = smooth circle, 1 = highly irregular
  rotation: "random" | "axis_aligned" | "along_terrain";
}

const SHAPE_TEMPLATES: Record<CommodityType, ShapeTemplate> = {
  // Industrial plantations — long, clean-edged, often follow road grids.
  palm_oil: { vertices: 10, aspectRatio: 1.6, jitter: 0.18, rotation: "axis_aligned" },
  soy: { vertices: 10, aspectRatio: 1.4, jitter: 0.22, rotation: "axis_aligned" },
  rubber: { vertices: 10, aspectRatio: 1.4, jitter: 0.15, rotation: "axis_aligned" },

  // Concessions following terrain — large, irregular, more vertices.
  timber: { vertices: 14, aspectRatio: 1.2, jitter: 0.42, rotation: "along_terrain" },
  cattle: { vertices: 16, aspectRatio: 1.3, jitter: 0.5,  rotation: "along_terrain" },

  // Smallholder plots — smaller, organic curves, fewer vertices.
  cocoa: { vertices: 8, aspectRatio: 1.1, jitter: 0.35, rotation: "random" },
  coffee: { vertices: 8, aspectRatio: 1.1, jitter: 0.32, rotation: "random" },
};

// ---------------------------------------------------------------------------
// Public API: organicPolygon(center, size, commodity, seedId) -> SimplePolygon
// ---------------------------------------------------------------------------

export function organicPolygon(
  centerLng: number,
  centerLat: number,
  sizeDeg: number,
  commodity: CommodityType,
  seedId: string,
): SimplePolygon {
  const template = SHAPE_TEMPLATES[commodity];
  const rand = seededRandom(hashString(`${seedId}|${commodity}`));

  const n = template.vertices;
  const baseRadius = sizeDeg / 2;

  // Random rotation offset so suppliers in similar regions don't all align.
  const rotationOffset = template.rotation === "random"
    ? rand() * Math.PI * 2
    : template.rotation === "axis_aligned"
      ? (rand() < 0.5 ? 0 : Math.PI / 2) + (rand() - 0.5) * 0.3
      : rand() * Math.PI;

  // Each vertex is sampled at an angle around the center, with the
  // radius perturbed by deterministic noise. The aspect ratio stretches
  // the polygon along one axis.
  const points: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const angle = t * Math.PI * 2 + rotationOffset;

    // Jitter the radius using a few harmonics so the boundary doesn't
    // look perfectly circular — but stays connected and convex-ish.
    const noise =
      Math.sin(angle * 2 + rand() * 6) * 0.4 +
      Math.sin(angle * 3 + rand() * 6) * 0.25 +
      (rand() - 0.5) * 0.3;
    const radius = baseRadius * (1 + noise * template.jitter);

    // Apply elongation via aspect ratio.
    const dx = Math.cos(angle) * radius * template.aspectRatio;
    const dy = Math.sin(angle) * radius;

    points.push([centerLng + dx, centerLat + dy]);
  }

  // Close ring.
  points.push([points[0][0], points[0][1]]);

  return { type: "Polygon", coordinates: [points] };
}
