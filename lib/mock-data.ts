// Single source of truth for mock data. In production this module is
// replaced by Supabase queries that join supplier, boundary, alert,
// satellite_metric, and risk_score tables.

import type {
  Alert,
  AuditCase,
  CommodityRiskProfile,
  CommodityType,
  ComplianceReport,
  CountryRiskProfile,
  NDVIObservation,
  RiskScore,
  SARObservation,
  SatelliteMetric,
  SimplePolygon,
  Supplier,
  SupplierBoundary,
  User,
} from "@/lib/types";
import {
  polygonAreaHectares,
  polygonCentroid,
  validateBoundary,
} from "@/lib/boundary-validation";
import {
  buildSatelliteMetric,
  getSentinel1SARMetrics,
  getSentinel2NDVITimeSeries,
  type ScenarioName,
} from "@/lib/satellite";
import { computeRiskScore } from "@/lib/risk-scoring";
import { buildAlertsForSupplier } from "@/lib/alert-engine";
import { organicPolygon } from "@/lib/polygon-generator";

// ---------------------------------------------------------------------------
// Static reference data
// ---------------------------------------------------------------------------

export const COMMODITY_RISK_PROFILES: Record<CommodityType, CommodityRiskProfile> = {
  palm_oil: { commodity: "palm_oil", inherentRisk: 88, primaryDriver: "tropical conversion in SE Asia" },
  soy: { commodity: "soy", inherentRisk: 80, primaryDriver: "Cerrado & Amazon expansion" },
  timber: { commodity: "timber", inherentRisk: 72, primaryDriver: "selective logging & plantations" },
  cocoa: { commodity: "cocoa", inherentRisk: 70, primaryDriver: "West Africa smallholder encroachment" },
  coffee: { commodity: "coffee", inherentRisk: 55, primaryDriver: "Andean & East African forest edge" },
  rubber: { commodity: "rubber", inherentRisk: 62, primaryDriver: "SE Asia plantation expansion" },
  cattle: { commodity: "cattle", inherentRisk: 90, primaryDriver: "Amazon & Cerrado clearance" },
};

export const COUNTRY_RISK_PROFILES: Record<string, CountryRiskProfile> = {
  IDN: { iso3: "IDN", countryName: "Indonesia", region: "Southeast Asia", baselineRisk: 80, governanceScore: 42, notes: "Active EUDR scrutiny; mixed enforcement of moratoria." },
  BRA: { iso3: "BRA", countryName: "Brazil", region: "South America", baselineRisk: 85, governanceScore: 48, notes: "PRODES & DETER active; cattle traceability gaps remain." },
  MYS: { iso3: "MYS", countryName: "Malaysia", region: "Southeast Asia", baselineRisk: 70, governanceScore: 55, notes: "MSPO certification scheme; Sarawak/Sabah hot zones." },
  CIV: { iso3: "CIV", countryName: "Côte d'Ivoire", region: "West Africa", baselineRisk: 75, governanceScore: 38, notes: "Significant cocoa-driven loss inside classified forests." },
  COL: { iso3: "COL", countryName: "Colombia", region: "South America", baselineRisk: 55, governanceScore: 58, notes: "Andean coffee belt; localized loss in piedmont zones." },
  THA: { iso3: "THA", countryName: "Thailand", region: "Southeast Asia", baselineRisk: 50, governanceScore: 60, notes: "Mature rubber plantations; lower frontier risk." },
  PER: { iso3: "PER", countryName: "Peru", region: "South America", baselineRisk: 60, governanceScore: 52, notes: "Amazon frontier with rising cocoa & palm pressure." },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rectanglePolygon(centerLng: number, centerLat: number, sizeDeg: number): SimplePolygon {
  const half = sizeDeg / 2;
  return {
    type: "Polygon",
    coordinates: [[
      [centerLng - half, centerLat - half],
      [centerLng + half, centerLat - half],
      [centerLng + half, centerLat + half],
      [centerLng - half, centerLat + half],
      [centerLng - half, centerLat - half],
    ]],
  };
}

interface SupplierSeed {
  id: string;
  name: string;
  parentGroup?: string;
  commodity: CommodityType;
  countryIso3: keyof typeof COUNTRY_RISK_PROFILES;
  region: string;
  centerLng: number;
  centerLat: number;
  sizeDeg: number;
  scenario: ScenarioName;
  certification: Supplier["certification"];
  documentationStatus: Supplier["documentationStatus"];
  procurementVolumeTonnesPerYear: number;
  procurementSpendUsd: number;
  procurementExposurePct: number;
  lastAuditDate: string | null;
  nextAuditDueDate: string | null;
  protectedOverlap: boolean;
  boundarySource: SupplierBoundary["source"];
  primaryContact: { name: string; email: string };
}

const SUPPLIER_SEEDS: SupplierSeed[] = [
  {
    id: "SUP-001",
    name: "Riau Lestari Sawit",
    parentGroup: "Lestari Holdings",
    commodity: "palm_oil",
    countryIso3: "IDN",
    region: "Riau, Sumatra",
    centerLng: 101.4,
    centerLat: 0.55,
    sizeDeg: 0.07,
    scenario: "ndvi_and_sar",
    certification: "RSPO",
    documentationStatus: "partial",
    procurementVolumeTonnesPerYear: 18_400,
    procurementSpendUsd: 14_200_000,
    procurementExposurePct: 6.2,
    lastAuditDate: "2024-07-12",
    nextAuditDueDate: "2026-07-12",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Andi Wijaya", email: "andi.wijaya@riaulestari.id" },
  },
  {
    id: "SUP-002",
    name: "Fazenda Cerrado Verde",
    parentGroup: "AgroVerde S.A.",
    commodity: "soy",
    countryIso3: "BRA",
    region: "Mato Grosso, Cerrado",
    centerLng: -54.8,
    centerLat: -12.4,
    sizeDeg: 0.18,
    scenario: "post_2020_loss",
    certification: "ProTerra",
    documentationStatus: "partial",
    procurementVolumeTonnesPerYear: 42_100,
    procurementSpendUsd: 19_800_000,
    procurementExposurePct: 9.8,
    lastAuditDate: "2024-03-04",
    nextAuditDueDate: "2026-03-04",
    protectedOverlap: false,
    boundarySource: "uploaded_shapefile",
    primaryContact: { name: "Mariana Costa", email: "m.costa@agroverde.com.br" },
  },
  {
    id: "SUP-003",
    name: "Sarawak Hardwood Cooperative",
    commodity: "timber",
    countryIso3: "MYS",
    region: "Sarawak, Borneo",
    centerLng: 113.9,
    centerLat: 2.3,
    sizeDeg: 0.12,
    scenario: "persistent_bare",
    certification: "None",
    documentationStatus: "missing",
    procurementVolumeTonnesPerYear: 9_600,
    procurementSpendUsd: 7_400_000,
    procurementExposurePct: 3.1,
    lastAuditDate: "2023-11-08",
    nextAuditDueDate: "2025-05-08",
    protectedOverlap: true,
    boundarySource: "drawn",
    primaryContact: { name: "Tan Wei Ling", email: "wlt@sarawakhwc.my" },
  },
  {
    id: "SUP-004",
    name: "Coopérative Cacao Daloa",
    commodity: "cocoa",
    countryIso3: "CIV",
    region: "Daloa Region",
    centerLng: -6.45,
    centerLat: 6.88,
    sizeDeg: 0.04,
    scenario: "ndvi_drop_only",
    certification: "Rainforest Alliance",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 5_800,
    procurementSpendUsd: 16_400_000,
    procurementExposurePct: 4.4,
    lastAuditDate: "2025-01-22",
    nextAuditDueDate: "2026-07-22",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Affoué Konan", email: "a.konan@cacaodaloa.ci" },
  },
  {
    id: "SUP-005",
    name: "Hacienda Andina Coffee",
    commodity: "coffee",
    countryIso3: "COL",
    region: "Huila, Andean piedmont",
    centerLng: -75.55,
    centerLat: 2.55,
    sizeDeg: 0.025,
    scenario: "stable_forest",
    certification: "Rainforest Alliance",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 2_200,
    procurementSpendUsd: 9_100_000,
    procurementExposurePct: 1.8,
    lastAuditDate: "2025-09-30",
    nextAuditDueDate: "2027-03-30",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Camilo Pérez", email: "c.perez@haciendaandina.co" },
  },
  {
    id: "SUP-006",
    name: "Surat Thani Rubber Estate",
    commodity: "rubber",
    countryIso3: "THA",
    region: "Surat Thani",
    centerLng: 99.32,
    centerLat: 9.12,
    sizeDeg: 0.06,
    scenario: "replanting_recovery",
    certification: "FSC",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 6_300,
    procurementSpendUsd: 5_800_000,
    procurementExposurePct: 2.6,
    lastAuditDate: "2024-12-02",
    nextAuditDueDate: "2026-06-02",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Niran Phakdi", email: "n.phakdi@stre.co.th" },
  },
  {
    id: "SUP-007",
    name: "Fazenda Pantanal Norte",
    parentGroup: "Pantanal Pecuária",
    commodity: "cattle",
    countryIso3: "BRA",
    region: "Mato Grosso, Amazon edge",
    centerLng: -56.3,
    centerLat: -9.8,
    sizeDeg: 0.25,
    scenario: "ndvi_and_sar",
    certification: "None",
    documentationStatus: "partial",
    procurementVolumeTonnesPerYear: 11_500,
    procurementSpendUsd: 22_300_000,
    procurementExposurePct: 7.9,
    lastAuditDate: "2023-06-19",
    nextAuditDueDate: "2025-06-19",
    protectedOverlap: false,
    boundarySource: "gps_point_buffered",
    primaryContact: { name: "Joaquim Almeida", email: "joaquim@pantanalpec.br" },
  },
  {
    id: "SUP-008",
    name: "Cocoa Smallholders Network Soubré",
    commodity: "cocoa",
    countryIso3: "CIV",
    region: "Soubré, Bas-Sassandra",
    centerLng: -6.6,
    centerLat: 5.79,
    sizeDeg: 0.018,
    scenario: "poor_boundary",
    certification: "Pending",
    documentationStatus: "missing",
    procurementVolumeTonnesPerYear: 1_900,
    procurementSpendUsd: 5_300_000,
    procurementExposurePct: 1.2,
    lastAuditDate: null,
    nextAuditDueDate: "2025-12-01",
    protectedOverlap: false,
    boundarySource: "gps_point_buffered",
    primaryContact: { name: "Yao Brou", email: "y.brou@csnsoubre.ci" },
  },
  {
    id: "SUP-009",
    name: "Amazonia Cacao Cooperative",
    commodity: "cocoa",
    countryIso3: "PER",
    region: "San Martín",
    centerLng: -76.3,
    centerLat: -6.45,
    sizeDeg: 0.04,
    scenario: "stable_forest",
    certification: "Rainforest Alliance",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 2_700,
    procurementSpendUsd: 6_900_000,
    procurementExposurePct: 1.7,
    lastAuditDate: "2025-04-11",
    nextAuditDueDate: "2026-10-11",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Lucía Vargas", email: "l.vargas@amazoniacacao.pe" },
  },
  {
    id: "SUP-010",
    name: "Kalimantan Sawit Mandiri",
    parentGroup: "Mandiri Group",
    commodity: "palm_oil",
    countryIso3: "IDN",
    region: "West Kalimantan",
    centerLng: 110.05,
    centerLat: -0.42,
    sizeDeg: 0.09,
    scenario: "post_2020_loss",
    certification: "RSPO",
    documentationStatus: "partial",
    procurementVolumeTonnesPerYear: 22_400,
    procurementSpendUsd: 17_500_000,
    procurementExposurePct: 7.4,
    lastAuditDate: "2024-02-14",
    nextAuditDueDate: "2026-02-14",
    protectedOverlap: true,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Bagas Hartono", email: "b.hartono@mandirisawit.id" },
  },
  // -------------------------------------------------------------------------
  // Low-risk seed suppliers — added to give the portfolio a realistic
  // distribution (~70% low/monitor, ~20% investigate, ~10% escalate) so the
  // audit-economics model produces credible savings without changing the
  // 10 alert-driving suppliers above.
  // -------------------------------------------------------------------------
  {
    id: "SUP-011",
    name: "Cooperativa Cafetera Antioquia",
    commodity: "coffee",
    countryIso3: "COL",
    region: "Antioquia, Andean",
    centerLng: -75.6,
    centerLat: 6.2,
    sizeDeg: 0.022,
    scenario: "stable_forest",
    certification: "Rainforest Alliance",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 1_900,
    procurementSpendUsd: 7_800_000,
    procurementExposurePct: 1.5,
    lastAuditDate: "2025-10-04",
    nextAuditDueDate: "2027-04-04",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Sofía Restrepo", email: "s.restrepo@cafetera-ant.co" },
  },
  {
    id: "SUP-012",
    name: "Highlands Coffee Estates",
    commodity: "coffee",
    countryIso3: "COL",
    region: "Cundinamarca",
    centerLng: -74.2,
    centerLat: 4.95,
    sizeDeg: 0.02,
    scenario: "stable_forest",
    certification: "Rainforest Alliance",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 2_100,
    procurementSpendUsd: 8_200_000,
    procurementExposurePct: 1.6,
    lastAuditDate: "2025-08-12",
    nextAuditDueDate: "2027-02-12",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Diego Marín", email: "d.marin@highlandscoffee.co" },
  },
  {
    id: "SUP-013",
    name: "Phuket Rubber Holdings",
    commodity: "rubber",
    countryIso3: "THA",
    region: "Phuket",
    centerLng: 98.35,
    centerLat: 7.95,
    sizeDeg: 0.055,
    scenario: "stable_forest",
    certification: "FSC",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 5_400,
    procurementSpendUsd: 4_900_000,
    procurementExposurePct: 2.1,
    lastAuditDate: "2025-06-21",
    nextAuditDueDate: "2027-12-21",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Pichai Suwan", email: "p.suwan@phuketrubber.th" },
  },
  {
    id: "SUP-014",
    name: "Cooperativa Cacao Bahia",
    commodity: "cocoa",
    countryIso3: "BRA",
    region: "Bahia, Atlantic Forest",
    centerLng: -39.1,
    centerLat: -14.8,
    sizeDeg: 0.03,
    scenario: "stable_forest",
    certification: "Rainforest Alliance",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 3_100,
    procurementSpendUsd: 8_700_000,
    procurementExposurePct: 2,
    lastAuditDate: "2025-09-18",
    nextAuditDueDate: "2027-03-18",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Helena Souza", email: "h.souza@cacaobahia.com.br" },
  },
  {
    id: "SUP-015",
    name: "Andean Cacao Cooperative",
    commodity: "cocoa",
    countryIso3: "PER",
    region: "Junín",
    centerLng: -74.6,
    centerLat: -10.9,
    sizeDeg: 0.035,
    scenario: "stable_forest",
    certification: "Rainforest Alliance",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 2_400,
    procurementSpendUsd: 6_200_000,
    procurementExposurePct: 1.6,
    lastAuditDate: "2025-07-30",
    nextAuditDueDate: "2027-01-30",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Rosa Quispe", email: "r.quispe@andeancacao.pe" },
  },
  {
    id: "SUP-016",
    name: "Riau Mature Plantations",
    parentGroup: "Lestari Holdings",
    commodity: "palm_oil",
    countryIso3: "IDN",
    region: "Riau, Sumatra",
    centerLng: 102.2,
    centerLat: 0.9,
    sizeDeg: 0.08,
    scenario: "stable_forest",
    certification: "RSPO",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 14_500,
    procurementSpendUsd: 11_200_000,
    procurementExposurePct: 4.9,
    lastAuditDate: "2025-05-08",
    nextAuditDueDate: "2027-11-08",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Sari Putra", email: "s.putra@riaumature.id" },
  },
  {
    id: "SUP-017",
    name: "Sabah Sustainable Forestry",
    commodity: "timber",
    countryIso3: "MYS",
    region: "Sabah",
    centerLng: 116.8,
    centerLat: 5.4,
    sizeDeg: 0.11,
    scenario: "stable_forest",
    certification: "FSC",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 8_200,
    procurementSpendUsd: 6_400_000,
    procurementExposurePct: 2.7,
    lastAuditDate: "2025-04-15",
    nextAuditDueDate: "2027-10-15",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Ahmad Rahman", email: "a.rahman@sabahsustainable.my" },
  },
  {
    id: "SUP-018",
    name: "Fazenda Soy Verde Norte",
    parentGroup: "AgroVerde S.A.",
    commodity: "soy",
    countryIso3: "BRA",
    region: "Paraná",
    centerLng: -52.4,
    centerLat: -24.6,
    sizeDeg: 0.16,
    scenario: "stable_forest",
    certification: "ProTerra",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 34_800,
    procurementSpendUsd: 16_400_000,
    procurementExposurePct: 7.2,
    lastAuditDate: "2025-11-02",
    nextAuditDueDate: "2027-05-02",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Eduardo Lima", email: "e.lima@soyverdenorte.com.br" },
  },
  {
    id: "SUP-019",
    name: "Côte d'Ivoire Cocoa Network West",
    commodity: "cocoa",
    countryIso3: "CIV",
    region: "Bas-Sassandra",
    centerLng: -7.1,
    centerLat: 5.2,
    sizeDeg: 0.025,
    scenario: "stable_forest",
    certification: "Rainforest Alliance",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 2_600,
    procurementSpendUsd: 7_400_000,
    procurementExposurePct: 1.7,
    lastAuditDate: "2025-06-04",
    nextAuditDueDate: "2027-12-04",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Aya Koffi", email: "a.koffi@cicw.ci" },
  },
  {
    id: "SUP-020",
    name: "Surat Thani Heritage Rubber",
    commodity: "rubber",
    countryIso3: "THA",
    region: "Surat Thani",
    centerLng: 99.8,
    centerLat: 9.4,
    sizeDeg: 0.05,
    scenario: "stable_forest",
    certification: "FSC",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 4_700,
    procurementSpendUsd: 4_200_000,
    procurementExposurePct: 1.8,
    lastAuditDate: "2025-08-29",
    nextAuditDueDate: "2027-02-28",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Malee Wong", email: "m.wong@stheritage.th" },
  },
  {
    id: "SUP-021",
    name: "Coffee Cooperative Cauca",
    commodity: "coffee",
    countryIso3: "COL",
    region: "Cauca",
    centerLng: -76.6,
    centerLat: 2.45,
    sizeDeg: 0.018,
    scenario: "stable_forest",
    certification: "Rainforest Alliance",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 1_700,
    procurementSpendUsd: 6_800_000,
    procurementExposurePct: 1.4,
    lastAuditDate: "2025-09-11",
    nextAuditDueDate: "2027-03-11",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Andrés Castro", email: "a.castro@cafecauca.co" },
  },
  {
    id: "SUP-022",
    name: "Sumatera Cocoa Smallholders",
    commodity: "cocoa",
    countryIso3: "IDN",
    region: "North Sumatra",
    centerLng: 99.3,
    centerLat: 2.1,
    sizeDeg: 0.02,
    scenario: "stable_forest",
    certification: "Rainforest Alliance",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 1_500,
    procurementSpendUsd: 4_300_000,
    procurementExposurePct: 1,
    lastAuditDate: "2025-10-22",
    nextAuditDueDate: "2027-04-22",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Putri Lubis", email: "p.lubis@sumcocoa.id" },
  },
  {
    id: "SUP-023",
    name: "Pantanal Sustainable Cattle",
    commodity: "cattle",
    countryIso3: "BRA",
    region: "South Pantanal",
    centerLng: -57.4,
    centerLat: -19.6,
    sizeDeg: 0.22,
    scenario: "replanting_recovery",
    certification: "Rainforest Alliance",
    documentationStatus: "complete",
    procurementVolumeTonnesPerYear: 9_800,
    procurementSpendUsd: 18_900_000,
    procurementExposurePct: 6.5,
    lastAuditDate: "2025-07-18",
    nextAuditDueDate: "2027-01-18",
    protectedOverlap: false,
    boundarySource: "uploaded_geojson",
    primaryContact: { name: "Beatriz Oliveira", email: "b.oliveira@pantanalsust.br" },
  },
];

// ---------------------------------------------------------------------------

export interface SupplierBundle {
  supplier: Supplier;
  boundary: SupplierBoundary;
  satellite: SatelliteMetric;
  ndvi: NDVIObservation[];
  sar: SARObservation[];
  alerts: Alert[];
  riskScore: RiskScore;
  scenario: ScenarioName;
}

const DATE_RANGE = { start: "2024-11-01", end: "2026-05-15" };

function buildBundle(seed: SupplierSeed): SupplierBundle {
  // Procedural commodity-templated boundary: industrial plantations get
  // elongated clean shapes, concessions get larger irregular polygons,
  // smallholder plots get smaller organic shapes. Deterministic per seed ID.
  const polygon = organicPolygon(
    seed.centerLng,
    seed.centerLat,
    seed.sizeDeg,
    seed.commodity,
    seed.id,
  );

  const validation = validateBoundary({
    polygon,
    source: seed.boundarySource,
    overlapsProtectedArea: seed.protectedOverlap,
  });
  const area = polygonAreaHectares(polygon);
  const protectedOverlapHa = seed.protectedOverlap ? Math.round(area * 0.18) : 0;

  const supplier: Supplier = {
    id: seed.id,
    name: seed.name,
    parentGroup: seed.parentGroup,
    commodity: seed.commodity,
    countryIso3: seed.countryIso3,
    countryName: COUNTRY_RISK_PROFILES[seed.countryIso3].countryName,
    region: seed.region,
    certification: seed.certification,
    documentationStatus: seed.documentationStatus,
    procurementVolumeTonnesPerYear: seed.procurementVolumeTonnesPerYear,
    procurementSpendUsd: seed.procurementSpendUsd,
    procurementExposurePct: seed.procurementExposurePct,
    lastAuditDate: seed.lastAuditDate,
    nextAuditDueDate: seed.nextAuditDueDate,
    onboardedAt: "2023-08-15",
    primaryContact: seed.primaryContact,
  };

  const boundary: SupplierBoundary = {
    id: `BND-${seed.id}`,
    supplierId: seed.id,
    polygon,
    areaHectares: area,
    source: seed.boundarySource,
    uploadedAt: "2024-09-04T10:24:00Z",
    uploadedBy: "compliance-onboarding",
    quality: validation.quality,
    qualityScore: validation.qualityScore,
    validationIssues: validation.issues,
    protectedAreaOverlapHectares: protectedOverlapHa,
    centroid: polygonCentroid(polygon),
  };

  const ndvi = getSentinel2NDVITimeSeries(polygon, DATE_RANGE, { scenario: seed.scenario });
  const sar = getSentinel1SARMetrics(polygon, DATE_RANGE, { scenario: seed.scenario });
  const satellite = buildSatelliteMetric(seed.id, polygon, area, DATE_RANGE, { scenario: seed.scenario });

  const lastNdvi = ndvi[ndvi.length - 1];
  const ndviAnomalyPct =
    ((lastNdvi.ndvi - lastNdvi.seasonalBaselineNdvi) / lastNdvi.seasonalBaselineNdvi) * 100;
  const lastSar = sar[sar.length - 1];
  const sarDelta = lastSar.backscatterDb - lastSar.baselineBackscatterDb;
  const sarLevel: "none" | "weak" | "moderate" | "strong" =
    sarDelta > 3 ? "strong" : sarDelta > 2 ? "moderate" : sarDelta > 1 ? "weak" : "none";

  const riskScore = computeRiskScore({
    supplierId: seed.id,
    satellite,
    boundary,
    commodityProfile: COMMODITY_RISK_PROFILES[seed.commodity],
    countryProfile: COUNTRY_RISK_PROFILES[seed.countryIso3],
    ndviAnomalyPct,
    sarDisturbanceLevel: sarLevel,
    externalAlertCount: satellite.externalAlertMatchCount,
  });

  const alerts = buildAlertsForSupplier({
    supplierId: seed.id,
    satellite,
    boundary,
    ndvi,
    sar,
  });

  return { supplier, boundary, satellite, ndvi, sar, alerts, riskScore, scenario: seed.scenario };
}

// ---------------------------------------------------------------------------
// Public bundle builder — used by the upload form to onboard a supplier
// from real user-supplied inputs (polygon + metadata). Same pipeline as
// the seed loader: validate → satellite → risk → alerts.
// ---------------------------------------------------------------------------

export interface SupplierCreationInput {
  id?: string;
  name: string;
  commodity: CommodityType;
  countryIso3: keyof typeof COUNTRY_RISK_PROFILES | string;
  region?: string;
  polygon: SimplePolygon;
  boundarySource: SupplierBoundary["source"];
  overlapsProtectedArea?: boolean;
  certification?: Supplier["certification"];
  documentationStatus?: Supplier["documentationStatus"];
  procurementVolumeTonnesPerYear?: number;
  procurementSpendUsd?: number;
  procurementExposurePct?: number;
  primaryContact?: { name: string; email: string };
  scenario?: ScenarioName;
  parentGroup?: string;
}

const DEFAULT_COUNTRY_PROFILE: CountryRiskProfile = {
  iso3: "UNK",
  countryName: "Unknown",
  region: "Unknown",
  baselineRisk: 60,
  governanceScore: 50,
  notes: "No published country risk profile on file; baseline assumptions applied.",
};

function pickCountryProfile(iso3: string): CountryRiskProfile {
  return COUNTRY_RISK_PROFILES[iso3] ?? { ...DEFAULT_COUNTRY_PROFILE, iso3, countryName: iso3 };
}

// Pick a scenario hint so the synthetic satellite series correlates with
// real signals on the polygon (commodity inherent risk, country baseline,
// boundary issues). In production the underlying GEE pipeline doesn't
// need hints — the satellite data tells the truth on its own.
function inferScenario(commodity: CommodityType, country: CountryRiskProfile, qualityScore: number): ScenarioName {
  const inherent = COMMODITY_RISK_PROFILES[commodity].inherentRisk;
  const combined = inherent * 0.6 + country.baselineRisk * 0.4;
  if (qualityScore < 60) return "poor_boundary";
  if (combined >= 80) return "ndvi_and_sar";
  if (combined >= 70) return "post_2020_loss";
  if (combined >= 55) return "ndvi_drop_only";
  return "stable_forest";
}

export function createSupplierBundle(input: SupplierCreationInput): SupplierBundle {
  const id = input.id ?? nextSupplierId();
  const country = pickCountryProfile(input.countryIso3);

  const validation = validateBoundary({
    polygon: input.polygon,
    source: input.boundarySource,
    overlapsProtectedArea: input.overlapsProtectedArea ?? false,
  });
  const area = polygonAreaHectares(input.polygon);
  const protectedOverlapHa = input.overlapsProtectedArea ? Math.round(area * 0.18) : 0;
  const scenario = input.scenario ?? inferScenario(input.commodity, country, validation.qualityScore);

  const supplier: Supplier = {
    id,
    name: input.name,
    parentGroup: input.parentGroup,
    commodity: input.commodity,
    countryIso3: input.countryIso3,
    countryName: country.countryName,
    region: input.region ?? country.region,
    certification: input.certification ?? "None",
    documentationStatus: input.documentationStatus ?? "partial",
    procurementVolumeTonnesPerYear: input.procurementVolumeTonnesPerYear ?? 5_000,
    procurementSpendUsd: input.procurementSpendUsd ?? 4_500_000,
    procurementExposurePct: input.procurementExposurePct ?? 2,
    lastAuditDate: null,
    nextAuditDueDate: nextAuditDueIso(),
    onboardedAt: new Date().toISOString(),
    primaryContact: input.primaryContact ?? { name: "—", email: "—" },
  };

  const boundary: SupplierBoundary = {
    id: `BND-${id}`,
    supplierId: id,
    polygon: input.polygon,
    areaHectares: area,
    source: input.boundarySource,
    uploadedAt: new Date().toISOString(),
    uploadedBy: "you",
    quality: validation.quality,
    qualityScore: validation.qualityScore,
    validationIssues: validation.issues,
    protectedAreaOverlapHectares: protectedOverlapHa,
    centroid: polygonCentroid(input.polygon),
  };

  const ndvi = getSentinel2NDVITimeSeries(input.polygon, DATE_RANGE, { scenario });
  const sar = getSentinel1SARMetrics(input.polygon, DATE_RANGE, { scenario });
  const satellite = buildSatelliteMetric(id, input.polygon, area, DATE_RANGE, { scenario });

  const lastNdvi = ndvi[ndvi.length - 1];
  const ndviAnomalyPct =
    ((lastNdvi.ndvi - lastNdvi.seasonalBaselineNdvi) / lastNdvi.seasonalBaselineNdvi) * 100;
  const lastSar = sar[sar.length - 1];
  const sarDelta = lastSar.backscatterDb - lastSar.baselineBackscatterDb;
  const sarLevel: "none" | "weak" | "moderate" | "strong" =
    sarDelta > 3 ? "strong" : sarDelta > 2 ? "moderate" : sarDelta > 1 ? "weak" : "none";

  const riskScore = computeRiskScore({
    supplierId: id,
    satellite,
    boundary,
    commodityProfile: COMMODITY_RISK_PROFILES[input.commodity],
    countryProfile: country,
    ndviAnomalyPct,
    sarDisturbanceLevel: sarLevel,
    externalAlertCount: satellite.externalAlertMatchCount,
  });

  const alerts = buildAlertsForSupplier({
    supplierId: id,
    satellite,
    boundary,
    ndvi,
    sar,
  });

  return { supplier, boundary, satellite, ndvi, sar, alerts, riskScore, scenario };
}

// Auto-generated supplier IDs continue after the seed set (SUP-011, SUP-012, …).
let _supplierIdSeq = 24;
function nextSupplierId(): string {
  const id = `SUP-${String(_supplierIdSeq).padStart(3, "0")}`;
  _supplierIdSeq += 1;
  return id;
}

function nextAuditDueIso(): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 6);
  return d.toISOString().slice(0, 10);
}

// Optional: derive an audit case from a high-risk bundle so the queue
// reacts to new uploads the same way it does to seed data.
export function deriveAuditCaseFromBundle(bundle: SupplierBundle, sequenceOffset = 0): AuditCase | null {
  if (bundle.riskScore.score < 40) return null;
  const priority = Math.min(5, Math.max(1, Math.ceil((100 - bundle.riskScore.score) / 20))) as 1 | 2 | 3 | 4 | 5;
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + 21);
  return {
    id: `AUD-${3000 + sequenceOffset}`,
    supplierId: bundle.supplier.id,
    priority,
    status: "queued",
    openedAt: today,
    dueBy: due.toISOString().slice(0, 10),
    assignedTo: "Unassigned",
    triggerAlertIds: bundle.alerts.slice(0, 2).map((a) => a.alert_id),
    summary: `${bundle.supplier.name} flagged at onboarding with risk score ${bundle.riskScore.score} (${bundle.riskScore.classification}).`,
  };
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

export const SUPPLIER_BUNDLES: SupplierBundle[] = SUPPLIER_SEEDS.map(buildBundle);

export const SUPPLIERS: Supplier[] = SUPPLIER_BUNDLES.map((b) => b.supplier);
export const BOUNDARIES: SupplierBoundary[] = SUPPLIER_BUNDLES.map((b) => b.boundary);
export const RISK_SCORES: RiskScore[] = SUPPLIER_BUNDLES.map((b) => b.riskScore);
export const SATELLITE_METRICS: SatelliteMetric[] = SUPPLIER_BUNDLES.map((b) => b.satellite);
export const ALERTS: Alert[] = SUPPLIER_BUNDLES.flatMap((b) => b.alerts);

// Sprinkle status variety so the alerts queue doesn't look all "new".
ALERTS.forEach((alert, idx) => {
  if (idx % 7 === 0) alert.status = "under_review";
  else if (idx % 7 === 1) alert.status = "supplier_contacted";
  else if (idx % 7 === 2) alert.status = "evidence_requested";
  else if (idx % 7 === 3) alert.status = "escalated_to_audit";
  else if (idx % 13 === 0) alert.status = "resolved";
});

export function getBundle(supplierId: string): SupplierBundle | undefined {
  return SUPPLIER_BUNDLES.find((b) => b.supplier.id === supplierId);
}

export function getAlert(alertId: string): Alert | undefined {
  return ALERTS.find((a) => a.alert_id === alertId);
}

// ---------------------------------------------------------------------------
// Audit cases derived from highest-risk suppliers
// ---------------------------------------------------------------------------

export const AUDIT_CASES: AuditCase[] = SUPPLIER_BUNDLES
  .filter((b) => b.riskScore.score >= 40)
  .sort((a, b) => b.riskScore.score - a.riskScore.score)
  .map((b, idx) => ({
    id: `AUD-${(2001 + idx).toString()}`,
    supplierId: b.supplier.id,
    priority: (Math.min(5, Math.max(1, Math.ceil((100 - b.riskScore.score) / 20))) as 1 | 2 | 3 | 4 | 5),
    status: idx === 0 ? "in_progress" : idx === 1 ? "awaiting_response" : "queued",
    openedAt: "2026-04-22",
    dueBy: "2026-06-12",
    assignedTo: ["Priya Raman", "Diego Santos", "Hannah Lee"][idx % 3],
    triggerAlertIds: b.alerts.slice(0, 2).map((a) => a.alert_id),
    summary: `${b.supplier.name} flagged with risk score ${b.riskScore.score} (${b.riskScore.classification}).`,
  }));

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export const COMPLIANCE_REPORTS: ComplianceReport[] = SUPPLIER_BUNDLES.slice(0, 5).map((b, idx) => ({
  id: `RPT-${5001 + idx}`,
  supplierId: b.supplier.id,
  generatedAt: "2026-05-01T08:00:00Z",
  periodStart: "2026-01-01",
  periodEnd: "2026-04-30",
  riskScore: b.riskScore.score,
  classification: b.riskScore.classification,
  sections: [
    "Supplier identity",
    "Boundary map",
    "2020 baseline composite",
    "Current composite",
    "NDVI & SAR change charts",
    "Alert history",
    "Risk score explanation",
    "Data quality notes",
    "Human review status",
    "Supplier response",
    "Due diligence summary",
  ],
  reviewer: "Compliance Lead",
  disclaimer:
    "This is a satellite-based due diligence evidence report. It provides risk indicators only and does not constitute a legal certification of land-use status. Findings are based on available public satellite data and the supplier-provided boundary.",
}));

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const CURRENT_USER: User = {
  id: "USR-001",
  name: "Jess Mitchell",
  email: "jess.mitchell@cpg.example",
  role: "sustainability_officer",
  team: "Sustainability & Compliance",
};

export const TEAM_MEMBERS: User[] = [
  CURRENT_USER,
  { id: "USR-002", name: "Priya Raman", email: "priya@cpg.example", role: "compliance_lead", team: "Sustainability & Compliance" },
  { id: "USR-003", name: "Diego Santos", email: "diego@cpg.example", role: "auditor", team: "Internal Audit" },
  { id: "USR-004", name: "Hannah Lee", email: "hannah@cpg.example", role: "procurement_manager", team: "Procurement" },
];

// ---------------------------------------------------------------------------
// Dashboard aggregations
// ---------------------------------------------------------------------------

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

export function computeDashboardMetrics(): DashboardMetrics {
  const totalHa = BOUNDARIES.reduce((s, b) => s + b.areaHectares, 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const newAlertsThisMonth = ALERTS.filter((a) => a.first_detected_date.startsWith(currentMonth)).length
    || ALERTS.filter((a) => a.status === "new").length;
  const lowRiskVolume = SUPPLIER_BUNDLES
    .filter((b) => b.riskScore.classification === "low" || b.riskScore.classification === "monitor")
    .reduce((s, b) => s + b.supplier.procurementVolumeTonnesPerYear, 0);
  const totalVolume = SUPPLIERS.reduce((s, x) => s + x.procurementVolumeTonnesPerYear, 0);
  const completeDocs = SUPPLIERS.filter((s) => s.documentationStatus === "complete").length;
  return {
    totalSuppliers: SUPPLIERS.length,
    totalHectares: totalHa,
    newAlertsThisMonth,
    highRiskSupplierCount: SUPPLIER_BUNDLES.filter(
      (b) => b.riskScore.classification === "investigate" || b.riskScore.classification === "escalate",
    ).length,
    lowRiskVolumePct: Math.round((lowRiskVolume / Math.max(1, totalVolume)) * 100),
    evidenceCompletenessPct: Math.round((completeDocs / SUPPLIERS.length) * 100),
    auditQueueCount: AUDIT_CASES.length,
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

export function commodityBreakdown(): CommodityBreakdown[] {
  const map = new Map<CommodityType, CommodityBreakdown>();
  for (const bundle of SUPPLIER_BUNDLES) {
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

export function countryBreakdown(): CountryBreakdown[] {
  const map = new Map<string, CountryBreakdown>();
  for (const bundle of SUPPLIER_BUNDLES) {
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

export function alertsByMonth(): { month: string; count: number; resolved: number }[] {
  const map = new Map<string, { count: number; resolved: number }>();
  for (const a of ALERTS) {
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
