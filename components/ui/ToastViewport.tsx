"use client";

import { useCaseStore } from "@/lib/case-store";
import { CheckCircle2, X } from "lucide-react";

export function ToastViewport() {
  const { notifications, dismissToast } = useCaseStore();
  if (notifications.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-canopy-100 bg-white px-3 py-2.5 shadow-elevated"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-canopy-700" />
          <p className="flex-1 text-xs text-ink-800">{n.message}</p>
          <button
            className="text-ink-400 hover:text-ink-700"
            onClick={() => dismissToast(n.id)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
