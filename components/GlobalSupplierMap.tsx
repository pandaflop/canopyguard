"use client";

// Stylised world map with risk-colored supplier markers. SVG-only so it
// renders on the server with no Mapbox/Leaflet dependency. Replace with
// a real tile layer + GeoJSON for production.

import Link from "next/link";
import { useState } from "react";
import type { RiskClassification, Supplier, SupplierBoundary } from "@/lib/types";
import { cn, formatHectares } from "@/lib/utils";

const RISK_COLOR: Record<RiskClassification, string> = {
  low: "#2d8a55",
  monitor: "#c79621",
  investigate: "#d97742",
  escalate: "#b6354b",
};

// Stylised landmass paths (very rough; intentionally not geographically precise).
// These look like continents enough to convey supply-chain geography.
const CONTINENTS: { name: string; d: string }[] = [
  // North America
  {
    name: "NA",
    d: "M 60 80 Q 95 50 145 60 Q 180 65 200 95 Q 215 115 195 145 Q 175 175 145 175 Q 110 175 85 155 Q 55 130 60 80 Z",
  },
  // South America
  { name: "SA", d: "M 200 200 Q 225 185 245 215 Q 260 245 250 285 Q 240 320 220 335 Q 200 340 195 305 Q 190 260 200 200 Z" },
  // Europe
  { name: "EU", d: "M 380 95 Q 410 80 440 95 Q 460 110 450 135 Q 430 145 405 140 Q 380 130 380 95 Z" },
  // Africa
  { name: "AF", d: "M 410 165 Q 445 155 470 185 Q 490 225 475 275 Q 455 310 425 310 Q 405 290 405 250 Q 405 205 410 165 Z" },
  // Asia
  { name: "AS", d: "M 470 75 Q 540 60 620 85 Q 680 105 700 145 Q 690 180 640 195 Q 580 200 540 180 Q 490 155 470 75 Z" },
  // SE Asia
  { name: "SEA", d: "M 660 200 Q 690 195 720 215 Q 735 230 720 245 Q 685 250 665 240 Q 650 225 660 200 Z" },
  // Oceania
  { name: "OC", d: "M 700 280 Q 745 270 780 290 Q 785 310 760 320 Q 720 320 700 305 Q 690 290 700 280 Z" },
];

function project(lng: number, lat: number): { x: number; y: number } {
  // Equirectangular projection into our 820x420 viewBox.
  const x = ((lng + 180) / 360) * 820;
  const y = ((90 - lat) / 180) * 420;
  return { x, y };
}

export function GlobalSupplierMap({
  suppliers,
  boundaries,
  classifications,
}: {
  suppliers: Supplier[];
  boundaries: SupplierBoundary[];
  classifications: Record<string, RiskClassification>;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-lg bg-gradient-to-br from-ink-100 to-ink-50">
      <svg viewBox="0 0 820 420" className="h-full w-full">
        {/* Graticule */}
        <g stroke="rgba(15,23,42,0.06)" strokeWidth={0.5}>
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`gh${i}`} x1={0} y1={i * 42} x2={820} y2={i * 42} />
          ))}
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`gv${i}`} x1={i * 82} y1={0} x2={i * 82} y2={420} />
          ))}
        </g>

        {/* Continents */}
        <g fill="#dceae0" stroke="#bbd6c4" strokeWidth={1} strokeLinejoin="round">
          {CONTINENTS.map((c) => (
            <path key={c.name} d={c.d} />
          ))}
        </g>

        {/* Supplier markers */}
        {boundaries.map((b) => {
          const supplier = suppliers.find((s) => s.id === b.supplierId);
          if (!supplier) return null;
          const cls = classifications[b.supplierId] ?? "monitor";
          const { x, y } = project(b.centroid[0], b.centroid[1]);
          const isHovered = hovered === b.supplierId;
          return (
            <g
              key={b.supplierId}
              transform={`translate(${x},${y})`}
              onMouseEnter={() => setHovered(b.supplierId)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <circle
                r={isHovered ? 14 : 11}
                fill={RISK_COLOR[cls]}
                fillOpacity={0.18}
              />
              <circle
                r={isHovered ? 7 : 5.5}
                fill={RISK_COLOR[cls]}
                stroke="#fff"
                strokeWidth={1.5}
              />
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip card */}
      {hovered &&
        (() => {
          const b = boundaries.find((x) => x.supplierId === hovered)!;
          const s = suppliers.find((x) => x.id === hovered)!;
          const cls = classifications[hovered] ?? "monitor";
          const { x, y } = project(b.centroid[0], b.centroid[1]);
          const left = `${Math.min(80, (x / 820) * 100)}%`;
          const top = `${Math.min(80, (y / 420) * 100)}%`;
          return (
            <Link
              href={`/suppliers/${s.id}`}
              className="absolute z-10 w-60 -translate-y-2 rounded-lg border border-ink-200 bg-white p-3 shadow-elevated"
              style={{ left, top }}
            >
              <p className="text-xs font-semibold text-ink-900">{s.name}</p>
              <p className="text-[11px] text-ink-500">
                {s.countryName} · {s.region}
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span
                  className="rounded-full px-2 py-0.5 font-medium text-white"
                  style={{ background: RISK_COLOR[cls] }}
                >
                  {cls}
                </span>
                <span className="font-mono text-ink-600">{formatHectares(b.areaHectares)}</span>
              </div>
            </Link>
          );
        })()}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-md bg-white/90 px-3 py-1.5 text-[10px] shadow-sm backdrop-blur">
        {(["low", "monitor", "investigate", "escalate"] as RiskClassification[]).map((c) => (
          <span key={c} className="flex items-center gap-1.5 capitalize text-ink-700">
            <span
              className={cn("h-2 w-2 rounded-full")}
              style={{ background: RISK_COLOR[c] }}
            />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
