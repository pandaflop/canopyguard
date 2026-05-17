"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SupplierTable } from "@/components/SupplierTable";
import { SupplierCard } from "@/components/SupplierCard";
import { COMMODITY_LABELS, type CommodityType, type RiskClassification, RISK_BANDS } from "@/lib/types";
import { formatHectares } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useSupplierBundles } from "@/lib/case-store";
import { X } from "lucide-react";

const RISK_OPTIONS: RiskClassification[] = ["low", "monitor", "investigate", "escalate"];

type CertOption = "all" | "certified" | "uncertified";

export function SuppliersExplorer() {
  const bundles = useSupplierBundles();
  const [commodities, setCommodities] = useState<Set<CommodityType>>(new Set());
  const [risks, setRisks] = useState<Set<RiskClassification>>(new Set());
  const [countries, setCountries] = useState<Set<string>>(new Set());
  const [cert, setCert] = useState<CertOption>("all");

  function toggle<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) {
    setter((cur) => {
      const next = new Set(cur);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function reset() {
    setCommodities(new Set());
    setRisks(new Set());
    setCountries(new Set());
    setCert("all");
  }

  const commodityOptions = useMemo(() => {
    const counts = new Map<CommodityType, number>();
    for (const b of bundles) {
      counts.set(b.supplier.commodity, (counts.get(b.supplier.commodity) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [bundles]);

  const countryOptions = useMemo(() => {
    const counts = new Map<string, { name: string; n: number }>();
    for (const b of bundles) {
      const cur = counts.get(b.supplier.countryIso3) ?? { name: b.supplier.countryName, n: 0 };
      cur.n += 1;
      counts.set(b.supplier.countryIso3, cur);
    }
    return [...counts.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [bundles]);

  const filtered = useMemo(() => {
    return bundles.filter(({ supplier, riskScore }) => {
      if (commodities.size > 0 && !commodities.has(supplier.commodity)) return false;
      if (risks.size > 0 && !risks.has(riskScore.classification)) return false;
      if (countries.size > 0 && !countries.has(supplier.countryIso3)) return false;
      if (cert === "certified" && (supplier.certification === "None" || supplier.certification === "Pending")) return false;
      if (cert === "uncertified" && supplier.certification !== "None" && supplier.certification !== "Pending") return false;
      return true;
    });
  }, [bundles, commodities, risks, countries, cert]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.riskScore.score - a.riskScore.score),
    [filtered],
  );

  const totalHa = sorted.reduce((s, b) => s + b.boundary.areaHectares, 0);
  const anyFilter = commodities.size > 0 || risks.size > 0 || countries.size > 0 || cert !== "all";

  return (
    <div className="space-y-6">
      <Card padded={false}>
        <div className="border-b border-ink-100 px-5 py-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
              Commodity
            </span>
            <div className="flex flex-wrap gap-1.5">
              {commodityOptions.map(([c, n]) => (
                <Chip
                  key={c}
                  active={commodities.has(c)}
                  onClick={() => toggle(setCommodities, c)}
                >
                  {COMMODITY_LABELS[c]} <span className="opacity-60">· {n}</span>
                </Chip>
              ))}
            </div>
          </div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
              Risk
            </span>
            <div className="flex flex-wrap gap-1.5">
              {RISK_OPTIONS.map((r) => (
                <Chip
                  key={r}
                  active={risks.has(r)}
                  onClick={() => toggle(setRisks, r)}
                  intent={r}
                >
                  {RISK_BANDS.find((b) => b.classification === r)?.label ?? r}
                </Chip>
              ))}
            </div>
          </div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
              Country
            </span>
            <div className="flex flex-wrap gap-1.5">
              {countryOptions.map(([iso, info]) => (
                <Chip
                  key={iso}
                  active={countries.has(iso)}
                  onClick={() => toggle(setCountries, iso)}
                >
                  {info.name} <span className="opacity-60">· {info.n}</span>
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
              Certification
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={cert === "all"} onClick={() => setCert("all")}>All</Chip>
              <Chip active={cert === "certified"} onClick={() => setCert("certified")}>Certified</Chip>
              <Chip active={cert === "uncertified"} onClick={() => setCert("uncertified")}>Uncertified / pending</Chip>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[11px]">
          <span className="text-ink-500">
            <strong className="text-ink-900">{sorted.length}</strong> of {bundles.length} suppliers ·{" "}
            {formatHectares(totalHa)} monitored
          </span>
          {anyFilter && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-2 py-1 font-medium text-ink-700 hover:bg-ink-50"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>
      </Card>

      {sorted.length === 0 ? (
        <Card className="flex h-48 flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-ink-700">No suppliers match the current filters</p>
          <button
            onClick={reset}
            className="mt-2 text-xs font-medium text-canopy-700 hover:text-canopy-900"
          >
            Clear filters
          </button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {sorted.slice(0, 4).map((b) => (
              <SupplierCard key={b.supplier.id} bundle={b} />
            ))}
          </div>
          <SupplierTable bundles={sorted} />
        </>
      )}
    </div>
  );
}

function Chip({
  active,
  intent,
  onClick,
  children,
}: {
  active: boolean;
  intent?: RiskClassification;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const intentDot =
    intent === "low"
      ? "bg-risk-low"
      : intent === "monitor"
        ? "bg-risk-monitor"
        : intent === "investigate"
          ? "bg-risk-investigate"
          : intent === "escalate"
            ? "bg-risk-escalate"
            : null;
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition",
        active
          ? "border-canopy-300 bg-canopy-50 text-canopy-800"
          : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50",
      )}
    >
      {intentDot && <span className={cn("h-1.5 w-1.5 rounded-full", intentDot)} />}
      {children}
    </button>
  );
}
