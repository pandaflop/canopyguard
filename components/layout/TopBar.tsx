"use client";

import { Filter } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { HelpMenu } from "./HelpMenu";
import { NotificationsMenu } from "./NotificationsMenu";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-ink-200/70 bg-white/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:px-10">
      <div className="flex flex-1 items-center">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2">
        <button className="hidden items-center gap-1.5 rounded-md border border-ink-200/80 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 md:inline-flex">
          <Filter className="h-3.5 w-3.5 text-ink-500" />
          Monitoring window: Last 12 mo.
        </button>
        <HelpMenu />
        <NotificationsMenu />
      </div>
    </header>
  );
}
