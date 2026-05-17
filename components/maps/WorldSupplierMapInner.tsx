"use client";

// Leaflet-based world map of all supplier polygons, colored by risk
// classification. Markers + polygon outlines on real OSM tiles.

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { MapContainer, TileLayer, CircleMarker, Polygon, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { RiskClassification, Supplier, SupplierBoundary } from "@/lib/types";
import { COMMODITY_LABELS } from "@/lib/types";
import { formatHectares, formatPct } from "@/lib/utils";

const RISK_COLOR: Record<RiskClassification, string> = {
  low: "#2d8a55",
  monitor: "#c79621",
  investigate: "#d97742",
  escalate: "#b6354b",
};

function toLatLng(p: [number, number]): [number, number] {
  return [p[1], p[0]];
}

function FitAllBounds({
  boundaries,
}: {
  boundaries: SupplierBoundary[];
}) {
  const map = useMap();
  useMemo(() => {
    if (boundaries.length === 0) return;
    const allPoints = boundaries.flatMap((b) => b.polygon.coordinates[0].map(toLatLng));
    const bounds = L.latLngBounds(allPoints as L.LatLngTuple[]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 4 });
  }, [boundaries, map]);
  return null;
}

export interface WorldSupplierMapInnerProps {
  suppliers: Supplier[];
  boundaries: SupplierBoundary[];
  classifications: Record<string, RiskClassification>;
  height?: number;
  showPolygons?: boolean;
}

export default function WorldSupplierMapInner({
  suppliers,
  boundaries,
  classifications,
  height = 420,
  showPolygons = true,
}: WorldSupplierMapInnerProps) {
  const router = useRouter();
  return (
    <div className="relative overflow-hidden rounded-xl" style={{ height }}>
      <MapContainer
        center={[10, 20]}
        zoom={2}
        worldCopyJump
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &amp; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          subdomains={"abcd"}
        />
        <FitAllBounds boundaries={boundaries} />

        {boundaries.map((b) => {
          const supplier = suppliers.find((s) => s.id === b.supplierId);
          if (!supplier) return null;
          const cls = classifications[b.supplierId] ?? "monitor";
          const color = RISK_COLOR[cls];
          const center: [number, number] = [b.centroid[1], b.centroid[0]];

          return (
            <div key={b.supplierId}>
              {showPolygons && (
                <Polygon
                  positions={b.polygon.coordinates[0].map(toLatLng)}
                  pathOptions={{
                    color,
                    weight: 1.5,
                    opacity: 0.85,
                    fill: true,
                    fillColor: color,
                    fillOpacity: 0.2,
                  }}
                />
              )}
              <CircleMarker
                center={center}
                radius={7}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fill: true,
                  fillColor: color,
                  fillOpacity: 1,
                }}
                eventHandlers={{
                  click: () => router.push(`/suppliers/${supplier.id}`),
                  mouseover: (e) => {
                    // Slight grow on hover so the cursor target affordance is obvious.
                    e.target.setStyle({ radius: 9 });
                  },
                  mouseout: (e) => {
                    e.target.setStyle({ radius: 7 });
                  },
                }}
                // Pointer cursor so users see this is clickable.
                bubblingMouseEvents={false}
                interactive
                className="cursor-pointer"
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                  <div className="min-w-[180px]">
                    <p className="text-[12px] font-semibold text-ink-900">{supplier.name}</p>
                    <p className="text-[10px] text-ink-500">
                      {supplier.countryName} · {supplier.region}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px]">
                      <span
                        className="rounded-full px-1.5 py-0.5 font-medium text-white"
                        style={{ background: color }}
                      >
                        {cls}
                      </span>
                      <span className="font-mono text-ink-600">
                        {COMMODITY_LABELS[supplier.commodity]} · {formatHectares(b.areaHectares)}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[9px] text-ink-500">
                      Exposure {formatPct(supplier.procurementExposurePct)}
                    </p>
                    <p className="mt-1.5 text-[10px] font-medium text-canopy-700">
                      Click marker to open profile →
                    </p>
                  </div>
                </Tooltip>
              </CircleMarker>
            </div>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex items-center gap-3 rounded-md bg-white/90 px-3 py-1.5 text-[10px] shadow-sm backdrop-blur">
        {(["low", "monitor", "investigate", "escalate"] as RiskClassification[]).map((c) => (
          <span key={c} className="flex items-center gap-1.5 capitalize text-ink-700">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: RISK_COLOR[c] }}
            />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
