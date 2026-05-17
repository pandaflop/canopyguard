// Pure aggregation helpers that operate on a passed-in bundle list, so
// both the static seed exports and session-added uploads flow through
// identically.

import type {
  Alert,
  CommodityType,
  RiskClassification,
} from "@/lib/types";
import type { SupplierBundle } from "@/lib/mock-data";

export interface DashboardMetrics {
  totalSuppliers: number;
  totalHectares: number;
  newAlertsThisMonth: number;
  highRiskSupplierCount: number;
  lowRiskVolumePct: number;
  evidenceCompletenessPct: number;
  auditQueueCount: number;
  avgAlertResponseHours: number;
}

export function dashboardMetrics(bundles: SupplierBundle[], alerts: Alert[]): DashboardMetrics {
  const totalHa = bundles.reduce((s, b) => s + b.boundary.areaHectares, 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const newAlertsThisMonth = alerts.filter((a) => a.first_detected_date.startsWith(currentMonth)).length
    || alerts.filter((a) => a.status === "new").length;
  const lowRiskVolume = bundles
    .filter((b) => b.riskScore.classification === "low" || b.riskScore.classification === "monitor")
    .reduce((s, b) => s + b.supplier.procurementVolumeTonnesPerYear, 0);
  const totalVolume = bundles.reduce((s, b) => s + b.supplier.procurementVolumeTonnesPerYear, 0);
  const completeDocs = bundles.filter((b) => b.supplier.documentationStatus === "complete").length;
  const highRiskCount = bundles.filter(
    (b) => b.riskScore.classification === "investigate" || b.riskScore.classification === "escalate",
  ).length;
  return {
    totalSuppliers: bundles.length,
    totalHectares: totalHa,
    newAlertsThisMonth,
    highRiskSupplierCount: highRiskCount,
    lowRiskVolumePct: totalVolume > 0 ? Math.round((lowRiskVolume / totalVolume) * 100) : 0,
    evidenceCompletenessPct: bundles.length > 0 ? Math.round((completeDocs / bundles.length) * 100) : 0,
    auditQueueCount: highRiskCount,
    avgAlertResponseHours: 36,
  };
}

export interface CommodityBreakdown {
  commodity: CommodityType;
  supplierCount: number;
  averageRisk: number;
  totalHectares: number;
  procurementSpendUsd: number;
}

export function commodityBreakdownFrom(bundles: SupplierBundle[]): CommodityBreakdown[] {
  const map = new Map<CommodityType, CommodityBreakdown>();
  for (const bundle of bundles) {
    const c = bundle.supplier.commodity;
    const cur = map.get(c) ?? {
      commodity: c,
      supplierCount: 0,
      averageRisk: 0,
      totalHectares: 0,
      procurementSpendUsd: 0,
    };
    cur.supplierCount += 1;
    cur.averageRisk += bundle.riskScore.score;
    cur.totalHectares += bundle.boundary.areaHectares;
    cur.procurementSpendUsd += bundle.supplier.procurementSpendUsd;
    map.set(c, cur);
  }
  return [...map.values()]
    .map((c) => ({ ...c, averageRisk: Math.round(c.averageRisk / c.supplierCount) }))
    .sort((a, b) => b.averageRisk - a.averageRisk);
}

export interface CountryBreakdown {
  countryIso3: string;
  countryName: string;
  supplierCount: number;
  averageRisk: number;
  totalHectares: number;
  exposurePct: number;
}

export function countryBreakdownFrom(bundles: SupplierBundle[]): CountryBreakdown[] {
  const map = new Map<string, CountryBreakdown>();
  for (const bundle of bundles) {
    const iso = bundle.supplier.countryIso3;
    const cur = map.get(iso) ?? {
      countryIso3: iso,
      countryName: bundle.supplier.countryName,
      supplierCount: 0,
      averageRisk: 0,
      totalHectares: 0,
      exposurePct: 0,
    };
    cur.supplierCount += 1;
    cur.averageRisk += bundle.riskScore.score;
    cur.totalHectares += bundle.boundary.areaHectares;
    cur.exposurePct += bundle.supplier.procurementExposurePct;
    map.set(iso, cur);
  }
  return [...map.values()]
    .map((c) => ({ ...c, averageRisk: Math.round(c.averageRisk / c.supplierCount) }))
    .sort((a, b) => b.averageRisk - a.averageRisk);
}

export function alertsByMonthFrom(alerts: Alert[]): { month: string; count: number; resolved: number }[] {
  const map = new Map<string, { count: number; resolved: number }>();
  for (const a of alerts) {
    const m = a.first_detected_date.slice(0, 7);
    const cur = map.get(m) ?? { count: 0, resolved: 0 };
    cur.count += 1;
    if (a.status === "resolved") cur.resolved += 1;
    map.set(m, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));
}

export function classificationsFrom(bundles: SupplierBundle[]): Record<string, RiskClassification> {
  return Object.fromEntries(bundles.map((b) => [b.supplier.id, b.riskScore.classification]));
}
