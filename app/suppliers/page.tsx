"use client";

import Link from "next/link";
import { SuppliersExplorer } from "@/components/SuppliersExplorer";
import { useSupplierBundles } from "@/lib/case-store";
import { Upload } from "lucide-react";

export default function SuppliersPage() {
  const bundles = useSupplierBundles();
  const distinctCommodities = new Set(bundles.map((b) => b.supplier.commodity)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-canopy-700">Supplier registry</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
            {bundles.length} active suppliers
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Boundary-monitored producers across {distinctCommodities} commodities. Toggle chips to filter; click any
            supplier to open the full profile.
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-1.5 rounded-md border border-canopy-700 bg-canopy-700 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-canopy-800"
        >
          <Upload className="h-3.5 w-3.5" /> Onboard supplier boundary
        </Link>
      </div>

      <SuppliersExplorer />
    </div>
  );
}
