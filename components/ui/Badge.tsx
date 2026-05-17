import { cn } from "@/lib/utils";

type Tone =
  | "neutral"
  | "canopy"
  | "info"
  | "low"
  | "monitor"
  | "investigate"
  | "escalate"
  | "muted";

const TONE: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700 border-ink-200",
  canopy: "bg-canopy-50 text-canopy-800 border-canopy-100",
  info: "bg-sky-50 text-sky-700 border-sky-100",
  low: "bg-emerald-50 text-emerald-700 border-emerald-100",
  monitor: "bg-amber-50 text-amber-800 border-amber-100",
  investigate: "bg-orange-50 text-orange-800 border-orange-200",
  escalate: "bg-rose-50 text-rose-700 border-rose-200",
  muted: "bg-ink-50 text-ink-500 border-ink-200/70",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  dot,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TONE[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            tone === "low" && "bg-emerald-600",
            tone === "monitor" && "bg-amber-500",
            tone === "investigate" && "bg-orange-600",
            tone === "escalate" && "bg-rose-600",
            tone === "canopy" && "bg-canopy-700",
            tone === "info" && "bg-sky-600",
            tone === "neutral" && "bg-ink-500",
            tone === "muted" && "bg-ink-400",
          )}
        />
      )}
      {children}
    </span>
  );
}
