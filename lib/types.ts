// CanopyGuard core domain types.
// These mirror the shapes a real Postgres/PostGIS schema would expose,
// so swapping mock services for a Supabase + GEE backend is mechanical.

export type CommodityType =
  | "palm_oil"
  | "soy"
  | "timber"
  | "cocoa"
  | "coffee"
  | "rubber"
  | "cattle";

export const COMMODITY_LABELS: Record<CommodityType, string> = {
  palm_oil: "Palm Oil",
  soy: "Soy",
  timber: "Timber",
  cocoa: "Cocoa",
  coffee: "Coffee",
  rubber: "Rubber",
  cattle: "Cattle",
};

// Commodity-level inherent deforestation risk (0-100). Sourced from
// published industry exposure assessments in production.
export interface CommodityRiskProfile {
  commodity: CommodityType;
  inherentRisk: number;
  primaryDriver: string;
}

export interface CountryRiskProfile {
  iso3: string;
  countryName: string;
  region: string;
  baselineRisk: number; // 0-100
  governanceScore: number; // 0-100, higher = stronger forest governance
  notes: string;
}

// ---------------------------------------------------------------------------
// Boundary / geometry
// ---------------------------------------------------------------------------

export type BoundaryQuality = "high" | "medium" | "low" | "needs_review";

// Simplified polygon: array of [lng, lat] rings. Real backend would store
// PostGIS geometry(Polygon, 4326).
export interface SimplePolygon {
  type: "Polygon";
  coordinates: [number, number][][]; // outer ring + optional holes
}

export interface BoundaryValidationIssue {
  code:
    | "missing_polygon"
    | "invalid_geometry"
    | "area_too_small"
    | "area_too_large"
    | "protected_area_overlap"
    | "point_only_submission"
    | "duplicate_overlap"
    | "low_vertex_count";
  severity: "info" | "warning" | "error";
  message: string;
}

export interface SupplierBoundary {
  id: string;
  supplierId: string;
  polygon: SimplePolygon;
  areaHectares: number;
  source: "uploaded_geojson" | "uploaded_kml" | "uploaded_shapefile" | "drawn" | "gps_point_buffered";
  uploadedAt: string;
  uploadedBy: string;
  quality: BoundaryQuality;
  qualityScore: number; // 0-100
  validationIssues: BoundaryValidationIssue[];
  protectedAreaOverlapHectares: number;
  centroid: [number, number]; // [lng, lat]
}

// ---------------------------------------------------------------------------
// Satellite observations
// ---------------------------------------------------------------------------

export interface NDVIObservation {
  date: string; // ISO date
  ndvi: number; // -1..1, vegetation expected 0.2..0.9
  seasonalBaselineNdvi: number; // same-week historical median (2017-2020)
  cloudCoverPct: number;
}

export interface SARObservation {
  date: string;
  backscatterDb: number; // VV polarization, dB
  baselineBackscatterDb: number;
  disturbanceProbability: number; // 0-1
}

export interface SatelliteMetric {
  supplierId: string;
  baselineYear: number;
  baselineForestCoverPct: number;
  currentForestCoverPct: number;
  forestLossHectares: number; // positive => post-baseline loss
  bareSoilMonths: number; // consecutive months with NDVI < threshold
  externalAlertMatchCount: number; // GLAD/RADD/GFW-style matches
  lastObservationDate: string;
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export type AlertType =
  | "vegetation_anomaly"
  | "sar_canopy_disturbance"
  | "persistent_bare_soil"
  | "post_2020_forest_loss"
  | "boundary_quality_issue"
  | "protected_area_overlap"
  | "external_forest_alert_match"
  | "replanting_recovery"
  | "audit_overdue";

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  vegetation_anomaly: "Vegetation anomaly",
  sar_canopy_disturbance: "SAR-confirmed canopy disturbance",
  persistent_bare_soil: "Persistent bare soil",
  post_2020_forest_loss: "Likely post-2020 forest loss",
  boundary_quality_issue: "Boundary quality issue",
  protected_area_overlap: "Protected area overlap",
  external_forest_alert_match: "External forest alert match",
  replanting_recovery: "Replanting / recovery detected",
  audit_overdue: "Audit overdue",
};

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export type AlertStatus =
  | "new"
  | "under_review"
  | "supplier_contacted"
  | "evidence_requested"
  | "escalated_to_audit"
  | "resolved"
  | "suspended_pending_investigation";

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  new: "New",
  under_review: "Under review",
  supplier_contacted: "Supplier contacted",
  evidence_requested: "Evidence requested",
  escalated_to_audit: "Escalated to audit",
  resolved: "Resolved",
  suspended_pending_investigation: "Suspended pending investigation",
};

export interface Alert {
  alert_id: string;
  supplier_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  confidence: number; // 0-1
  first_detected_date: string;
  affected_area_hectares: number;
  affected_area_percentage: number;
  ndvi_change_percentage: number; // negative = vegetation loss
  sar_confirmation_level: "none" | "weak" | "moderate" | "strong";
  persistence_status: "transient" | "monitoring" | "persistent" | "permanent_likely";
  external_alert_match: boolean;
  recommended_action: string;
  evidence_summary: string;
  status: AlertStatus;
  decisionLog: AlertDecisionEntry[];
}

export interface AlertDecisionEntry {
  date: string;
  actor: string;
  action: string;
  note?: string;
}

// ---------------------------------------------------------------------------
// Risk scoring
// ---------------------------------------------------------------------------

export type RiskClassification = "low" | "monitor" | "investigate" | "escalate";

export const RISK_BANDS: { max: number; classification: RiskClassification; label: string }[] = [
  { max: 20, classification: "low", label: "Low risk" },
  { max: 45, classification: "monitor", label: "Monitor" },
  { max: 70, classification: "investigate", label: "Investigate" },
  { max: 100, classification: "escalate", label: "Escalate" },
];

export interface RiskScoreComponent {
  key:
    | "ndvi_anomaly"
    | "sar_disturbance"
    | "post_2020_loss"
    | "protected_overlap"
    | "commodity_risk"
    | "country_risk"
    | "data_quality";
  label: string;
  weight: number; // maximum points contributed
  rawSignal: number; // 0-1
  contribution: number; // points actually added (rawSignal * weight)
  rationale: string;
}

export interface RiskScore {
  supplierId: string;
  score: number; // 0-100
  classification: RiskClassification;
  components: RiskScoreComponent[];
  computedAt: string;
  modelVersion: string;
}

// ---------------------------------------------------------------------------
// Supplier
// ---------------------------------------------------------------------------

export type DocumentationStatus =
  | "complete"
  | "partial"
  | "missing"
  | "expired";

export interface Supplier {
  id: string;
  name: string;
  parentGroup?: string;
  commodity: CommodityType;
  countryIso3: string;
  countryName: string;
  region: string;
  certification: "RSPO" | "FSC" | "Rainforest Alliance" | "ProTerra" | "UTZ" | "None" | "Pending";
  documentationStatus: DocumentationStatus;
  procurementVolumeTonnesPerYear: number;
  procurementSpendUsd: number;
  procurementExposurePct: number; // share of CPG's total commodity volume
  lastAuditDate: string | null;
  nextAuditDueDate: string | null;
  onboardedAt: string;
  primaryContact: {
    name: string;
    email: string;
  };
}

// ---------------------------------------------------------------------------
// Audit & reports
// ---------------------------------------------------------------------------

export type AuditCaseStatus =
  | "queued"
  | "in_progress"
  | "awaiting_response"
  | "closed";

export interface AuditCase {
  id: string;
  supplierId: string;
  priority: 1 | 2 | 3 | 4 | 5;
  status: AuditCaseStatus;
  openedAt: string;
  dueBy: string;
  assignedTo: string;
  triggerAlertIds: string[];
  summary: string;
}

export interface ComplianceReport {
  id: string;
  supplierId: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  riskScore: number;
  classification: RiskClassification;
  sections: string[];
  reviewer: string;
  disclaimer: string;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type UserRole = "sustainability_officer" | "compliance_lead" | "procurement_manager" | "auditor" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team: string;
}
