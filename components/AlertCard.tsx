import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  ALERT_STATUS_LABELS,
  ALERT_TYPE_LABELS,
  type Alert,
} from "@/lib/types";
import { cn, formatDate, formatHectares, formatPct, formatRelativeDate } from "@/lib/utils";
import { ChevronRight, AlertTriangle, Satellite, Radar, TreeDeciduous, ShieldAlert, MapPin, Link2 } from "lucide-react";

const ICON_BY_TYPE: Record<string, React.ComponentType<{ className?: string }>> = {
  vegetation_anomaly: TreeDeciduous,
  sar_canopy_disturbance: Radar,
  persistent_bare_soil: AlertTriangle,
  post_2020_forest_loss: Satellite,
  boundary_quality_issue: MapPin,
  protected_area_overlap: ShieldAlert,
  external_forest_alert_match: Link2,
  replanting_recovery: TreeDeciduous,
  audit_overdue: AlertTriangle,
};

const SEVERITY_TONE = {
  low: "muted",
  medium: "monitor",
  high: "investigate",
  critical: "escalate",
} as const;

export function AlertCard({
  alert,
  supplierName,
  compact = false,
}: {
  alert: Alert;
  supplierName?: string;
  compact?: boolean;
}) {
  const Icon = ICON_BY_TYPE[alert.alert_type] ?? AlertTriangle;
  return (
    <Link
      href={`/alerts/${alert.alert_id}`}
      className={cn(
        "group block rounded-lg border border-ink-200/70 bg-white p-4 shadow-card transition hover:border-canopy-200 hover:shadow-elevated",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            alert.severity === "critical" && "bg-rose-50 text-rose-700",
            alert.severity === "high" && "bg-orange-50 text-orange-700",
            alert.severity === "medium" && "bg-amber-50 text-amber-700",
            alert.severity === "low" && "bg-ink-100 text-ink-500",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-ink-900 group-hover:text-canopy-800">
              {ALERT_TYPE_LABELS[alert.alert_type]}
            </p>
            <Badge tone={SEVERITY_TONE[alert.severity]} dot>
              {alert.severity}
            </Badge>
            <Badge tone="muted">{ALERT_STATUS_LABELS[alert.status]}</Badge>
          </div>
          {supplierName && (
            <p className="mt-0.5 text-[11px] text-ink-500">
              {supplierName} · alert <span className="font-mono">{alert.alert_id}</span>
            </p>
          )}
          {!compact && (
            <p className="mt-2 line-clamp-2 text-xs text-ink-600">{alert.evidence_summary}</p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-ink-500">
            <span>{formatRelativeDate(alert.first_detected_date)}</span>
            <span>·</span>
            <span>{formatHectares(alert.affected_area_hectares)} ({formatPct(alert.affected_area_percentage)})</span>
            {alert.ndvi_change_percentage !== 0 && (
              <>
                <span>·</span>
                <span className="font-mono">NDVI {alert.ndvi_change_percentage}%</span>
              </>
            )}
            {alert.sar_confirmation_level !== "none" && (
              <>
                <span>·</span>
                <span>SAR {alert.sar_confirmation_level}</span>
              </>
            )}
            {alert.external_alert_match && (
              <>
                <span>·</span>
                <span className="text-canopy-700">external alert match</span>
              </>
            )}
          </div>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-300 transition group-hover:text-canopy-600" />
      </div>
    </Link>
  );
}
