"use client";

// Client-side fuzzy search over suppliers, alerts, audit cases, and
// reports. In production this becomes a typeahead against a Postgres
// trigram index or a dedicated search backend.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, AlertTriangle, ClipboardList, FileText } from "lucide-react";
import { COMPLIANCE_REPORTS } from "@/lib/mock-data";
import { useAlerts, useAudits, useSuppliers } from "@/lib/case-store";
import { COMMODITY_LABELS, type Alert } from "@/lib/types";

interface Hit {
  kind: "supplier" | "alert" | "audit" | "report";
  href: string;
  title: string;
  subtitle: string;
  score: number;
}

const KIND_LABELS: Record<Hit["kind"], string> = {
  supplier: "Suppliers",
  alert: "Alerts",
  audit: "Audit cases",
  report: "Reports",
};

const KIND_ICONS: Record<Hit["kind"], React.ComponentType<{ className?: string }>> = {
  supplier: Building2,
  alert: AlertTriangle,
  audit: ClipboardList,
  report: FileText,
};

function scoreMatch(query: string, haystack: string): number {
  const q = query.toLowerCase().trim();
  const h = haystack.toLowerCase();
  if (!q) return 0;
  if (h === q) return 100;
  if (h.startsWith(q)) return 80;
  if (h.includes(q)) return 50;
  // Token-by-token fallback
  const tokens = q.split(/\s+/);
  let total = 0;
  for (const t of tokens) {
    if (h.includes(t)) total += 20;
  }
  return total;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const alerts = useAlerts();
  const SUPPLIERS = useSuppliers();
  const AUDIT_CASES = useAudits();

  // Click outside closes
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setFocused(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Keyboard shortcut: "/" or ⌘K focuses input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (!typing && e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    if (!query.trim()) return [];
    const out: Hit[] = [];

    for (const s of SUPPLIERS) {
      const score = Math.max(
        scoreMatch(query, s.name),
        scoreMatch(query, s.countryName),
        scoreMatch(query, s.region),
        scoreMatch(query, COMMODITY_LABELS[s.commodity]),
        scoreMatch(query, s.id),
      );
      if (score > 0) {
        out.push({
          kind: "supplier",
          href: `/suppliers/${s.id}`,
          title: s.name,
          subtitle: `${COMMODITY_LABELS[s.commodity]} · ${s.countryName} · ${s.id}`,
          score,
        });
      }
    }

    for (const a of alerts as Alert[]) {
      const sup = SUPPLIERS.find((x) => x.id === a.supplier_id);
      const score = Math.max(
        scoreMatch(query, a.alert_id),
        scoreMatch(query, a.alert_type.replace(/_/g, " ")),
        scoreMatch(query, sup?.name ?? ""),
      );
      if (score > 0) {
        out.push({
          kind: "alert",
          href: `/alerts/${a.alert_id}`,
          title: a.alert_type.replace(/_/g, " "),
          subtitle: `${sup?.name ?? a.supplier_id} · ${a.alert_id} · ${a.severity}`,
          score,
        });
      }
    }

    for (const c of AUDIT_CASES) {
      const sup = SUPPLIERS.find((x) => x.id === c.supplierId);
      const score = Math.max(
        scoreMatch(query, c.id),
        scoreMatch(query, sup?.name ?? ""),
        scoreMatch(query, c.assignedTo),
      );
      if (score > 0) {
        out.push({
          kind: "audit",
          href: `/audit`,
          title: `Audit case ${c.id}`,
          subtitle: `${sup?.name ?? c.supplierId} · P${c.priority} · ${c.assignedTo}`,
          score: score - 5,
        });
      }
    }

    for (const r of COMPLIANCE_REPORTS) {
      const sup = SUPPLIERS.find((x) => x.id === r.supplierId);
      const score = Math.max(
        scoreMatch(query, r.id),
        scoreMatch(query, sup?.name ?? ""),
      );
      if (score > 0) {
        out.push({
          kind: "report",
          href: `/reports?supplier=${r.supplierId}`,
          title: `Report ${r.id}`,
          subtitle: sup?.name ?? r.supplierId,
          score: score - 10,
        });
      }
    }

    return out.sort((a, b) => b.score - a.score).slice(0, 12);
  }, [query, alerts, SUPPLIERS, AUDIT_CASES]);

  // Reset active when results change
  useEffect(() => setActiveIdx(0), [query]);

  const grouped = useMemo(() => {
    const order: Hit["kind"][] = ["supplier", "alert", "audit", "report"];
    return order
      .map((k) => ({ kind: k, items: hits.filter((h) => h.kind === k) }))
      .filter((g) => g.items.length > 0);
  }, [hits]);

  function navigate(href: string) {
    setFocused(false);
    setQuery("");
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(hits.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && hits[activeIdx]) {
      navigate(hits[activeIdx].href);
    } else if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
  }

  const open = focused && query.trim().length > 0;

  return (
    <div ref={ref} className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={onKeyDown}
        placeholder="Search suppliers, alerts, regions…  (press /)"
        className="h-9 w-full rounded-md border border-ink-200/80 bg-ink-50 pl-9 pr-16 text-sm text-ink-900 placeholder:text-ink-400 focus:border-canopy-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-canopy-500/15"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-ink-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-500">
        /
      </kbd>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-ink-200/70 bg-white shadow-elevated">
          {hits.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-ink-500">
              No matches for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            grouped.map((g) => (
              <div key={g.kind} className="py-1">
                <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-ink-500">
                  {KIND_LABELS[g.kind]}
                </p>
                <ul>
                  {g.items.map((h) => {
                    const Icon = KIND_ICONS[h.kind];
                    const isActive = hits[activeIdx] === h;
                    return (
                      <li key={`${h.kind}-${h.href}-${h.title}`}>
                        <button
                          onMouseEnter={() => setActiveIdx(hits.indexOf(h))}
                          onClick={() => navigate(h.href)}
                          className={`flex w-full items-start gap-3 px-3 py-2 text-left transition ${
                            isActive ? "bg-canopy-50" : "hover:bg-ink-50"
                          }`}
                        >
                          <Icon
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                              isActive ? "text-canopy-700" : "text-ink-400"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium capitalize text-ink-900">
                              {h.title}
                            </p>
                            <p className="truncate text-[11px] capitalize text-ink-500">
                              {h.subtitle}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
          <div className="border-t border-ink-100 bg-ink-50/50 px-3 py-1.5 text-[10px] text-ink-500">
            ↑↓ to navigate · ↵ to open · esc to close
          </div>
        </div>
      )}
    </div>
  );
}
