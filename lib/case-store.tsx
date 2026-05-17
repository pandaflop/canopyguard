"use client";

// Session-scoped state store for suppliers, alerts, and audit cases.
// In production, replace useState with TanStack Query mutations against
// /api/suppliers, /api/alerts, /api/audit-cases. Decision-log entries
// become rows in the audit_log table.

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Alert, AlertStatus, AuditCase, AuditCaseStatus, Supplier } from "@/lib/types";
import {
  ALERTS,
  AUDIT_CASES,
  SUPPLIER_BUNDLES,
  deriveAuditCaseFromBundle,
  type SupplierBundle,
} from "@/lib/mock-data";

interface NotificationToast {
  id: number;
  message: string;
}

interface CaseStoreValue {
  bundles: SupplierBundle[];
  suppliers: Supplier[];
  alerts: Alert[];
  audits: AuditCase[];
  notifications: NotificationToast[];
  addSupplier(bundle: SupplierBundle): void;
  updateAlertStatus(alertId: string, status: AlertStatus, note?: string, actor?: string): void;
  appendAlertNote(alertId: string, note: string, actor?: string): void;
  updateAuditStatus(caseId: string, status: AuditCaseStatus): void;
  toast(message: string): void;
  dismissToast(id: number): void;
}

const CaseContext = createContext<CaseStoreValue | null>(null);

export function CaseProvider({ children }: { children: React.ReactNode }) {
  // Deep-clone initial data so user actions don't leak into the module-level singletons.
  const [bundles, setBundles] = useState<SupplierBundle[]>(() => SUPPLIER_BUNDLES.map((b) => b));
  const [alerts, setAlerts] = useState<Alert[]>(() =>
    ALERTS.map((a) => ({ ...a, decisionLog: a.decisionLog.map((d) => ({ ...d })) })),
  );
  const [audits, setAudits] = useState<AuditCase[]>(() => AUDIT_CASES.map((c) => ({ ...c })));
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);

  const toast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setNotifications((cur) => [...cur, { id, message }]);
    setTimeout(() => {
      setNotifications((cur) => cur.filter((n) => n.id !== id));
    }, 3200);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setNotifications((cur) => cur.filter((n) => n.id !== id));
  }, []);

  const addSupplier = useCallback((bundle: SupplierBundle) => {
    // Three side effects: add the bundle, ingest its alerts into the
    // queue, and open an audit case if the score crosses the threshold.
    setBundles((cur) => [...cur, bundle]);
    setAlerts((cur) => [
      ...cur,
      ...bundle.alerts.map((a) => ({ ...a, decisionLog: a.decisionLog.map((d) => ({ ...d })) })),
    ]);
    setAudits((cur) => {
      const next = deriveAuditCaseFromBundle(bundle, cur.length);
      return next ? [next, ...cur] : cur;
    });
    toast(`Onboarded ${bundle.supplier.name} — ${bundle.alerts.length} alert${bundle.alerts.length === 1 ? "" : "s"} generated, risk ${Math.round(bundle.riskScore.score)} (${bundle.riskScore.classification})`);
  }, [toast]);

  const updateAlertStatus = useCallback(
    (alertId: string, status: AlertStatus, note?: string, actor = "Jess Mitchell") => {
      setAlerts((cur) =>
        cur.map((a) =>
          a.alert_id === alertId
            ? {
                ...a,
                status,
                decisionLog: [
                  ...a.decisionLog,
                  {
                    date: new Date().toISOString(),
                    actor,
                    action: `Status changed to ${status.replace(/_/g, " ")}`,
                    note,
                  },
                ],
              }
            : a,
        ),
      );
      toast(`Alert ${alertId} → ${status.replace(/_/g, " ")}`);
    },
    [toast],
  );

  const appendAlertNote = useCallback(
    (alertId: string, note: string, actor = "Jess Mitchell") => {
      setAlerts((cur) =>
        cur.map((a) =>
          a.alert_id === alertId
            ? {
                ...a,
                decisionLog: [
                  ...a.decisionLog,
                  {
                    date: new Date().toISOString(),
                    actor,
                    action: "Reviewer note added",
                    note,
                  },
                ],
              }
            : a,
        ),
      );
      toast(`Note saved on ${alertId}`);
    },
    [toast],
  );

  const updateAuditStatus = useCallback(
    (caseId: string, status: AuditCaseStatus) => {
      setAudits((cur) => cur.map((c) => (c.id === caseId ? { ...c, status } : c)));
      toast(`Audit ${caseId} → ${status.replace(/_/g, " ")}`);
    },
    [toast],
  );

  const suppliers = useMemo(() => bundles.map((b) => b.supplier), [bundles]);

  const value = useMemo<CaseStoreValue>(
    () => ({
      bundles,
      suppliers,
      alerts,
      audits,
      notifications,
      addSupplier,
      updateAlertStatus,
      appendAlertNote,
      updateAuditStatus,
      toast,
      dismissToast,
    }),
    [bundles, suppliers, alerts, audits, notifications, addSupplier, updateAlertStatus, appendAlertNote, updateAuditStatus, toast, dismissToast],
  );

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}

export function useCaseStore(): CaseStoreValue {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error("useCaseStore must be used inside <CaseProvider>");
  return ctx;
}

// Narrow selectors so consumers re-render minimally.
export function useAlerts() {
  return useCaseStore().alerts;
}
export function useAlert(id: string): Alert | undefined {
  return useCaseStore().alerts.find((a) => a.alert_id === id);
}
export function useAudits() {
  return useCaseStore().audits;
}
export function useSupplierBundles() {
  return useCaseStore().bundles;
}
export function useSuppliers() {
  return useCaseStore().suppliers;
}
export function useBundle(id: string): SupplierBundle | undefined {
  return useCaseStore().bundles.find((b) => b.supplier.id === id);
}
