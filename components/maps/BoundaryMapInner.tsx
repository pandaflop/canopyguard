"use client";

// Client-only inner component for the boundary mini-map. Wraps Leaflet,
// which can't be SSR'd because it touches window/document on import.
// Loaded via next/dynamic({ ssr: false }) from BoundaryMap wrapper.

import { useMemo } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import type { SupplierBoundary } from "@/lib/types";
import type { ScenarioName } from "@/lib/satellite";
import { buildDisturbancePatches } from "./disturbance-overlay";

// Default Leaflet marker icons reference image assets via webpack; supply
// inline SVG icons instead so we don't depend on bundled asset paths.
const CENTROID_ICON = L.divIcon({
  className: "",
  html: '<div style="width:8px;height:8px;border-radius:50%;background:#ffffff;border:2px solid #234f3d;box-shadow:0 0 0 2px rgba(15,23,42,0.3)"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// React-Leaflet uses [lat, lng] but our polygons store [lng, lat].
function toLatLng(p: [number, number]): [number, number] {
  return [p[1], p[0]];
}

function FitBounds({ boundary }: { boundary: SupplierBoundary }) {
  const map = useMap();
  useMemo(() => {
    const ring = boundary.polygon.coordinates[0].map(toLatLng);
    const bounds = L.latLngBounds(ring as L.LatLngTuple[]);
    map.fitBounds(bounds, { padding: [16, 16], maxZoom: 14 });
  }, [boundary, map]);
  return null;
}

export interface BoundaryMapInnerProps {
  boundary: SupplierBoundary;
  height?: number;
  showDisturbance?: boolean;
  disturbancePct?: number; // 0..1 — drives spatial extent of disturbance patches
  scenario?: ScenarioName;
  supplierId?: string;
  title?: string;
  layer?: "current" | "baseline";
}

export default function BoundaryMapInner({
  boundary,
  height = 280,
  showDisturbance = false,
  disturbancePct = 0.2,
  scenario,
  supplierId,
  title,
  layer = "current",
}: BoundaryMapInnerProps) {
  const ringLatLng = boundary.polygon.coordinates[0].map(toLatLng);
  const center: [number, number] = [boundary.centroid[1], boundary.centroid[0]];

  const disturbance = useMemo(() => {
    if (!showDisturbance || !scenario) return null;
    return buildDisturbancePatches(
      boundary.polygon,
      scenario,
      disturbancePct,
      supplierId ?? boundary.supplierId,
    );
  }, [showDisturbance, scenario, disturbancePct, boundary, supplierId]);

  // The baseline tile layer is a bit darker / more saturated, current is sharper,
  // mimicking what comparing two satellite composites looks like. Both use the
  // same OSM tile source — visual differentiation is done with CSS filter overlay.
  const layerFilter =
    layer === "baseline"
      ? "saturate(0.85) hue-rotate(-8deg) brightness(0.92)"
      : "saturate(1) brightness(1)";

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl" style={{ height }}>
      {title && (
        <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-ink-700 shadow-sm backdrop-blur">
          {title}
        </div>
      )}
      {disturbance && disturbance.patches.length > 0 && (
        <div className="pointer-events-none absolute right-3 top-3 z-[400] max-w-[220px] rounded-md bg-white/90 px-2 py-1 text-[10px] leading-tight text-ink-700 shadow-sm backdrop-blur">
          <span className="font-semibold text-orange-700">Illustrative overlay</span>
          <br />
          <span className="text-ink-500">
            Pattern: {disturbance.label.toLowerCase()}. Exact location requires satellite raster confirmation.
          </span>
        </div>
      )}
      <div
        className="absolute inset-0"
        style={{ filter: layerFilter, transition: "filter 200ms ease" }}
      >
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          touchZoom={false}
          zoomControl={false}
          attributionControl={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds boundary={boundary} />

          {/* Supplier boundary outline */}
          <Polygon
            positions={ringLatLng}
            pathOptions={{
              color: "#ffffff",
              weight: 2.5,
              opacity: 0.95,
              fill: true,
              fillColor: "#234f3d",
              fillOpacity: layer === "baseline" ? 0.18 : 0.1,
              dashArray: "6 3",
            }}
          />

          {/* Disturbance patches */}
          {disturbance?.patches.map((patch, idx) => (
            <Polygon
              key={idx}
              positions={patch.ring.map(toLatLng)}
              pathOptions={{
                color: "#b6354b",
                weight: 1,
                opacity: 0.9,
                fill: true,
                fillColor: "#d97742",
                fillOpacity: patch.intensity,
              }}
            />
          ))}

          {/* Centroid pin */}
          <Marker position={center} icon={CENTROID_ICON} />
        </MapContainer>
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-[400] rounded-md bg-white/85 px-2 py-1 font-mono text-[10px] text-ink-700 shadow-sm backdrop-blur">
        {boundary.centroid[1].toFixed(3)}°, {boundary.centroid[0].toFixed(3)}°
      </div>
    </div>
  );
}
