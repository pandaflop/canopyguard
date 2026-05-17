// SVG-based mini-map of a supplier boundary. Production swaps this with
// a Mapbox GL or MapLibre instance using the raw polygon + satellite tile.

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { SupplierBoundary } from "@/lib/types";

interface MapPanelProps {
  boundary: SupplierBoundary;
  className?: string;
  height?: number;
  showDisturbance?: boolean;
  disturbancePct?: number; // 0..1, controls shaded overlay area
  title?: string;
  layer?: "current" | "baseline";
}

export function MapPanel({
  boundary,
  className,
  height = 280,
  showDisturbance = false,
  disturbancePct = 0.2,
  title,
  layer = "current",
}: MapPanelProps) {
  // Compute SVG viewport from polygon bounds.
  const ring = boundary.polygon.coordinates[0];
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const padX = (maxLng - minLng) * 0.25;
  const padY = (maxLat - minLat) * 0.25;
  const viewBoxW = (maxLng - minLng) + padX * 2;
  const viewBoxH = (maxLat - minLat) + padY * 2;
  // Map lng/lat into local svg coords (flip y).
  const toSvg = (p: [number, number]) => {
    const x = ((p[0] - (minLng - padX)) / viewBoxW) * 100;
    const y = (1 - (p[1] - (minLat - padY)) / viewBoxH) * 100;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };

  const pointsStr = ring.map(toSvg).join(" ");

  // Synthetic disturbance polygon = inset of original boundary scaled by disturbancePct.
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const disturbanceRing = ring.map((p) => {
    const dx = (p[0] - cx) * Math.sqrt(disturbancePct);
    const dy = (p[1] - cy) * Math.sqrt(disturbancePct);
    return [cx + dx + (maxLng - minLng) * 0.06, cy + dy - (maxLat - minLat) * 0.04] as [number, number];
  });
  const disturbStr = disturbanceRing.map(toSvg).join(" ");

  const isBaseline = layer === "baseline";

  return (
    <Card className={cn("relative overflow-hidden p-0", className)} padded={false}>
      {title && (
        <div className="absolute left-3 top-3 z-10 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-ink-700 shadow-sm backdrop-blur">
          {title}
        </div>
      )}
      <div
        className={cn(
          "relative w-full",
          isBaseline ? "bg-canopy-100" : "bg-canopy-50",
        )}
        style={{ height }}
      >
        {/* Faux satellite tile texture using overlaid radial gradients */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 opacity-90",
            isBaseline
              ? "bg-[radial-gradient(circle_at_30%_30%,#4a8a6c_0%,transparent_45%),radial-gradient(circle_at_70%_60%,#356b50_0%,transparent_50%),radial-gradient(circle_at_50%_85%,#2d634b_0%,transparent_55%)]"
              : "bg-[radial-gradient(circle_at_30%_30%,#5e9a7c_0%,transparent_45%),radial-gradient(circle_at_70%_60%,#3e7d60_0%,transparent_55%),radial-gradient(circle_at_50%_85%,#234f3d_0%,transparent_55%)]",
          )}
        />
        {/* Faint contour grid */}
        <svg
          className="absolute inset-0 h-full w-full opacity-25"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={i * 10}
              x2={100}
              y2={i * 10}
              stroke="#0b1d18"
              strokeWidth={0.15}
            />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={i * 10}
              y1={0}
              x2={i * 10}
              y2={100}
              stroke="#0b1d18"
              strokeWidth={0.15}
            />
          ))}
        </svg>
        {/* Polygon */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon
            points={pointsStr}
            fill={isBaseline ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)"}
            stroke="#ffffff"
            strokeWidth={0.6}
            strokeLinejoin="round"
            strokeDasharray="1.4 0.8"
          />
          {showDisturbance && (
            <polygon
              points={disturbStr}
              fill="rgba(217,119,66,0.55)"
              stroke="#b6354b"
              strokeWidth={0.5}
              strokeLinejoin="round"
            />
          )}
        </svg>
        {/* Compass + scale */}
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-white/85 px-2 py-1 text-[10px] font-medium text-ink-700 shadow-sm backdrop-blur">
          <span className="inline-block h-2 w-6 bg-ink-700"></span>
          ~{Math.round((viewBoxW * 111)).toLocaleString()} km
        </div>
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-white/85 px-2 py-1 font-mono text-[10px] text-ink-700 shadow-sm backdrop-blur">
          {boundary.centroid[1].toFixed(3)}°, {boundary.centroid[0].toFixed(3)}°
        </div>
      </div>
    </Card>
  );
}
