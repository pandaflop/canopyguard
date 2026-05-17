"use client";

// SSR-safe wrapper around the Leaflet-based boundary mini-map. Loads the
// inner component dynamically because Leaflet touches window/document at
// import time and breaks Next.js server rendering.

import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import type { BoundaryMapInnerProps } from "./BoundaryMapInner";

const BoundaryMapInner = dynamic(() => import("./BoundaryMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ink-100">
      <p className="text-xs text-ink-500">Loading map…</p>
    </div>
  ),
});

export function BoundaryMap(props: BoundaryMapInnerProps) {
  return (
    <Card padded={false} className="relative overflow-hidden p-0">
      <div style={{ height: props.height ?? 280 }}>
        <BoundaryMapInner {...props} />
      </div>
    </Card>
  );
}
