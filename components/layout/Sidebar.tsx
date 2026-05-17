"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  AlertTriangle,
  Map,
  ClipboardList,
  FileText,
  BarChart3,
  Settings,
  Upload,
  Leaf,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/suppliers", label: "Suppliers", icon: Building2 },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/map", label: "Map", icon: Map },
  { href: "/audit", label: "Audit Queue", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/upload", label: "Upload Boundary", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-200/70 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-ink-200/70 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-canopy-700 text-white shadow-sm">
          <Leaf className="h-5 w-5" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight text-ink-900">CanopyGuard</span>
          <span className="text-[10px] uppercase tracking-wider text-ink-500">Due-diligence engine</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-ink-400">
          Workspace
        </p>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-canopy-50 text-canopy-800"
                      : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-canopy-700" : "text-ink-400",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto rounded-full bg-canopy-100 px-2 py-0.5 text-[10px] font-semibold text-canopy-800">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 rounded-lg border border-canopy-100 bg-canopy-50/60 p-3">
          <p className="text-[11px] font-semibold text-canopy-800">EUDR readiness</p>
          <p className="mt-1 text-[11px] leading-snug text-canopy-800/80">
            74% of monitored volume now backed by satellite evidence. 6 supplier polygons still
            need a higher-quality boundary upload.
          </p>
        </div>
      </nav>

      <div className="border-t border-ink-200/70 p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-200 text-xs font-semibold text-ink-700">
            JM
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-semibold text-ink-900">Jess Mitchell</p>
            <p className="truncate text-[11px] text-ink-500">Sustainability Officer</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
