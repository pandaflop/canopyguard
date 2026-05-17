"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { useAlerts, useSuppliers } from "@/lib/case-store";
import { ALERT_TYPE_LABELS } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";

export function NotificationsMenu() {
  const alerts = useAlerts();
  const SUPPLIERS = useSuppliers();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const recent = useMemo(() => {
    return [...alerts]
      .sort((a, b) => b.first_detected_date.localeCompare(a.first_detected_date))
      .slice(0, 6);
  }, [alerts]);

  const unreadCount = recent.filter((a) => !readIds.has(a.alert_id) && a.status === "new").length;

  return (
    <Popover
      trigger={({ toggle, open }) => (
        <button
          onClick={toggle}
          className={`relative rounded-md border bg-white p-2 transition ${
            open
              ? "border-canopy-300 bg-canopy-50 text-canopy-700"
              : "border-ink-200/80 text-ink-500 hover:bg-ink-50 hover:text-ink-700"
          }`}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-risk-escalate px-1 text-[9px] font-semibold text-white ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink-900">Notifications</p>
              <p className="text-[11px] text-ink-500">
                {unreadCount > 0 ? `${unreadCount} new alert${unreadCount === 1 ? "" : "s"}` : "All caught up"}
              </p>
            </div>
            <button
              onClick={() => setReadIds(new Set(recent.map((a) => a.alert_id)))}
              className="text-[11px] font-medium text-canopy-700 hover:text-canopy-900"
            >
              Mark all read
            </button>
          </div>

          <ul className="max-h-[60vh] divide-y divide-ink-100 overflow-y-auto">
            {recent.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-ink-500">No alerts yet.</li>
            )}
            {recent.map((a) => {
              const supplier = SUPPLIERS.find((s) => s.id === a.supplier_id);
              const isUnread = a.status === "new" && !readIds.has(a.alert_id);
              return (
                <li key={a.alert_id}>
                  <Link
                    href={`/alerts/${a.alert_id}`}
                    onClick={() => {
                      setReadIds((cur) => new Set(cur).add(a.alert_id));
                      close();
                    }}
                    className="flex gap-3 px-4 py-2.5 transition hover:bg-ink-50"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        a.severity === "critical"
                          ? "bg-risk-escalate"
                          : a.severity === "high"
                            ? "bg-risk-investigate"
                            : a.severity === "medium"
                              ? "bg-risk-monitor"
                              : "bg-ink-400"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${
                          isUnread ? "font-semibold text-ink-900" : "font-medium text-ink-700"
                        }`}
                      >
                        {ALERT_TYPE_LABELS[a.alert_type]}
                      </p>
                      <p className="truncate text-[11px] text-ink-500">
                        {supplier?.name ?? a.supplier_id} · {formatRelativeDate(a.first_detected_date)}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="self-center rounded-full bg-canopy-100 px-1.5 py-0.5 text-[10px] font-semibold text-canopy-800">
                        new
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-ink-100 bg-ink-50/60 px-4 py-2 text-center">
            <Link
              href="/alerts"
              onClick={close}
              className="text-[11px] font-medium text-canopy-700 hover:text-canopy-900"
            >
              View all alerts →
            </Link>
          </div>
        </div>
      )}
    </Popover>
  );
}
