"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useCaseStore, useSupplierBundles } from "@/lib/case-store";
import { FileDown } from "lucide-react";

export function ReportsBuilder({ selectedId }: { selectedId?: string }) {
  const router = useRouter();
  const { toast } = useCaseStore();
  const bundles = useSupplierBundles();
  const [supplierId, setSupplierId] = useState(selectedId ?? bundles[0]?.supplier.id ?? "");
  const [periodStart, setPeriodStart] = useState("2026-01-01");
  const [periodEnd, setPeriodEnd] = useState("2026-04-30");
  const [includeAlertHistory, setIncludeAlertHistory] = useState(true);
  const [includeSar, setIncludeSar] = useState(true);
  const [generating, setGenerating] = useState(false);

  function onSupplierChange(id: string) {
    setSupplierId(id);
    router.push(`/reports?supplier=${id}`);
  }

  function onGenerate() {
    setGenerating(true);
    const supplier = bundles.find((b) => b.supplier.id === supplierId);
    setTimeout(() => {
      setGenerating(false);
      toast(`Evidence report queued for ${supplier?.supplier.name ?? supplierId} (${periodStart} → ${periodEnd})`);
    }, 700);
  }

  return (
    <Card>
      <CardHeader title="Generate new report" subtitle="Pick a supplier and a monitoring window" />
      <label className="block">
        <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">Supplier</span>
        <select
          value={supplierId}
          onChange={(e) => onSupplierChange(e.target.value)}
          className="mt-1 h-9 w-full rounded-md border border-ink-200 bg-white px-2 text-sm text-ink-900"
        >
          {bundles.map((b) => (
            <option key={b.supplier.id} value={b.supplier.id}>
              {b.supplier.name} ({b.supplier.id})
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">Period start</span>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-ink-200 bg-white px-2 text-sm text-ink-900"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">Period end</span>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-ink-200 bg-white px-2 text-sm text-ink-900"
          />
        </label>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-ink-700">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeAlertHistory}
            onChange={(e) => setIncludeAlertHistory(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Include alert history
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeSar}
            onChange={(e) => setIncludeSar(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Include Sentinel-1 SAR trend
        </label>
      </div>

      <Button
        size="sm"
        variant="primary"
        className="mt-4 w-full"
        onClick={onGenerate}
        disabled={generating || !supplierId || !periodStart || !periodEnd}
      >
        <FileDown className="h-3.5 w-3.5" />
        {generating ? "Queuing report…" : "Generate evidence report"}
      </Button>
      <p className="mt-2 text-[11px] leading-snug text-ink-500">
        Reports are produced as PDF + signed evidence bundle (satellite imagery, polygon, model version). In this
        demo, a toast confirms the action — no file is downloaded.
      </p>
    </Card>
  );
}
