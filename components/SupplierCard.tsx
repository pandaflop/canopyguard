import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RiskBadge } from "@/components/RiskBadge";
import type { SupplierBundle } from "@/lib/mock-data";
import { COMMODITY_LABELS } from "@/lib/types";
import { formatHectares, formatPct } from "@/lib/utils";

export function SupplierCard({ bundle }: { bundle: SupplierBundle }) {
  const { supplier, boundary, riskScore, alerts } = bundle;
  const openAlerts = alerts.filter((a) => a.status !== "resolved").length;

  return (
    <Link href={`/suppliers/${supplier.id}`}>
      <Card className="group h-full transition hover:border-canopy-300 hover:shadow-elevated">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900 group-hover:text-canopy-800">
              {supplier.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-ink-500">
              {COMMODITY_LABELS[supplier.commodity]} · {supplier.countryName}
            </p>
          </div>
          <RiskBadge classification={riskScore.classification} score={Math.round(riskScore.score)} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
          <Stat label="Area" value={formatHectares(boundary.areaHectares)} />
          <Stat label="Exposure" value={formatPct(supplier.procurementExposurePct)} />
          <Stat label="Open alerts" value={openAlerts.toString()} />
        </div>
      </Card>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-medium text-ink-900">{value}</p>
    </div>
  );
}
