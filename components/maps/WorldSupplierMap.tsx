"use client";

// SSR-safe wrapper around the Leaflet-based world supplier map.

import dynamic from "next/dynamic";
import type { WorldSupplierMapInnerProps } from "./WorldSupplierMapInner";

const WorldSupplierMapInner = dynamic(() => import("./WorldSupplierMapInner"), {
  ssr: false,
  loading: () => (
    <div
      className="flex w-full items-center justify-center rounded-xl bg-ink-100"
      style={{ height: 420 }}
    >
      <p className="text-xs text-ink-500">Loading global map…</p>
    </div>
  ),
});

export function WorldSupplierMap(props: WorldSupplierMapInnerProps) {
  return <WorldSupplierMapInner {...props} />;
}
