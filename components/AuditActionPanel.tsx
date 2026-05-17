"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useCaseStore } from "@/lib/case-store";
import {
  CheckCircle2,
  MailQuestion,
  ShieldAlert,
  Archive,
  Pause,
  FileDown,
} from "lucide-react";

export function AuditActionPanel({ supplierId, supplierName }: { supplierId: string; supplierName: string }) {
  const { alerts, updateAlertStatus, toast } = useCaseStore();
  const supplierAlerts = alerts.filter((a) => a.supplier_id === supplierId && a.status !== "resolved");

  function bulkUpdate(status: Parameters<typeof updateAlertStatus>[1], label: string) {
    if (supplierAlerts.length === 0) {
      toast(`No open alerts to ${label.toLowerCase()} for ${supplierName}`);
      return;
    }
    for (const a of supplierAlerts) updateAlertStatus(a.alert_id, status);
  }

  return (
    <Card>
      <CardHeader
        title="Case management"
        subtitle={`${supplierAlerts.length} open alert${supplierAlerts.length === 1 ? "" : "s"} on this supplier. Actions apply across the open queue.`}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => bulkUpdate("under_review", "Mark reviewed")}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Mark reviewed
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => bulkUpdate("supplier_contacted", "Request explanation")}
        >
          <MailQuestion className="h-3.5 w-3.5" /> Request explanation
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => bulkUpdate("escalated_to_audit", "Escalate")}
        >
          <ShieldAlert className="h-3.5 w-3.5" /> Escalate for audit
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => bulkUpdate("resolved", "Resolve")}
        >
          <Archive className="h-3.5 w-3.5" /> Mark resolved
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => bulkUpdate("suspended_pending_investigation", "Suspend")}
        >
          <Pause className="h-3.5 w-3.5" /> Suspend pending investigation
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => toast(`Evidence report queued for ${supplierName}`)}
        >
          <FileDown className="h-3.5 w-3.5" /> Generate evidence report
        </Button>
      </div>
    </Card>
  );
}
