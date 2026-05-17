"use client";

import { HelpCircle, BookOpen, Cpu, Mail, Keyboard, FileText } from "lucide-react";
import { Popover } from "@/components/ui/Popover";

export function HelpMenu() {
  return (
    <Popover
      trigger={({ toggle, open }) => (
        <button
          onClick={toggle}
          className={`rounded-md border bg-white p-2 transition ${
            open
              ? "border-canopy-300 bg-canopy-50 text-canopy-700"
              : "border-ink-200/80 text-ink-500 hover:bg-ink-50 hover:text-ink-700"
          }`}
          aria-label="Help and resources"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      )}
    >
      {() => (
        <div>
          <div className="border-b border-ink-100 px-4 py-3">
            <p className="text-sm font-semibold text-ink-900">Help &amp; resources</p>
            <p className="mt-0.5 text-[11px] text-ink-500">
              CanopyGuard surfaces risk indicators only — human review required before acting on any alert.
            </p>
          </div>

          <ul className="py-1.5">
            <Item icon={BookOpen} title="Product guide" subtitle="How CanopyGuard works end-to-end" />
            <Item icon={Cpu} title="Risk scoring methodology" subtitle="Model cg-risk-1.0 weights &amp; rationale" />
            <Item icon={FileText} title="Evidence report disclaimer" subtitle="What CanopyGuard can and cannot claim" />
            <Item icon={Mail} title="Contact support" subtitle="support@canopyguard.example" />
          </ul>

          <div className="border-t border-ink-100 bg-ink-50/60 px-4 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
              <Keyboard className="h-3 w-3" /> Keyboard shortcuts
            </p>
            <ul className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[11px] text-ink-700">
              <li>Focus search</li><li><Kbd>/</Kbd> <span className="text-ink-400">or</span> <Kbd>⌘K</Kbd></li>
              <li>Navigate results</li><li><Kbd>↑</Kbd> <Kbd>↓</Kbd></li>
              <li>Open result</li><li><Kbd>↵</Kbd></li>
              <li>Close menus</li><li><Kbd>esc</Kbd></li>
            </ul>
          </div>
        </div>
      )}
    </Popover>
  );
}

function Item({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <li>
      <button className="flex w-full items-start gap-2.5 px-4 py-2 text-left transition hover:bg-ink-50">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-canopy-700" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-900">{title}</p>
          <p className="text-[11px] text-ink-500">{subtitle}</p>
        </div>
      </button>
    </li>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-ink-200 bg-white px-1 py-0.5 font-mono text-[10px] text-ink-600">
      {children}
    </kbd>
  );
}
