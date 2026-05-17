import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { RiskBadge } from "@/components/RiskBadge";
import { COMMODITY_LABELS } from "@/lib/types";
import type { SupplierBundle } from "@/lib/mock-data";
import { formatHectares, formatPct, formatDate } from "@/lib/utils";

export function SupplierTable({ bundles }: { bundles: SupplierBundle[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200/70 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-ink-200/70 text-sm">
          <thead>
            <tr className="bg-ink-50/70 text-left text-[11px] uppercase tracking-wider text-ink-500">
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Commodity</th>
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 font-medium">Area</th>
              <th className="px-4 py-3 font-medium">Boundary</th>
              <th className="px-4 py-3 font-medium">Exposure</th>
              <th className="px-4 py-3 font-medium">Last audit</th>
              <th className="px-4 py-3 font-medium">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {bundles.map(({ supplier, boundary, riskScore }) => (
              <tr key={supplier.id} className="group transition hover:bg-ink-50/60">
                <td className="px-4 py-3">
                  <Link
                    href={`/suppliers/${supplier.id}`}
                    className="block min-w-0"
                  >
                    <p className="truncate text-sm font-medium text-ink-900 group-hover:text-canopy-800">
                      {supplier.name}
                    </p>
                    <p className="truncate text-[11px] text-ink-500">
                      {supplier.parentGroup ?? supplier.countryName} · {supplier.id}
                    </p>
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-700">{COMMODITY_LABELS[supplier.commodity]}</td>
                <td className="px-4 py-3 text-ink-700">
                  <span className="font-mono text-[11px] text-ink-500">{supplier.countryIso3}</span>{" "}
                  {supplier.region}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-700">{formatHectares(boundary.areaHectares)}</td>
                <td className="px-4 py-3">
                  <BoundaryQualityChip quality={boundary.quality} score={boundary.qualityScore} />
                </td>
                <td className="px-4 py-3 text-xs text-ink-700">{formatPct(supplier.procurementExposurePct)}</td>
                <td className="px-4 py-3 text-xs text-ink-700">{formatDate(supplier.lastAuditDate)}</td>
                <td className="px-4 py-3">
                  <RiskBadge classification={riskScore.classification} score={Math.round(riskScore.score)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BoundaryQualityChip({ quality, score }: { quality: string; score: number }) {
  const tone =
    quality === "high"
      ? "low"
      : quality === "medium"
        ? "monitor"
        : quality === "low"
          ? "investigate"
          : "escalate";
  return (
    <Badge tone={tone as any} dot>
      {quality.replace("_", " ")} · {score}
    </Badge>
  );
}
