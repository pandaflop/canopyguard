import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function MetricCard({
  label,
  value,
  hint,
  trend,
  trendDirection,
  intent = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  trend?: string;
  trendDirection?: "up" | "down";
  intent?: "neutral" | "positive" | "negative";
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col gap-2", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-ink-900">{value}</span>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
              intent === "positive" && "bg-emerald-50 text-emerald-700",
              intent === "negative" && "bg-rose-50 text-rose-700",
              intent === "neutral" && "bg-ink-100 text-ink-600",
            )}
          >
            {trendDirection === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend}
          </span>
        )}
      </div>
      {hint && <p className="text-xs leading-snug text-ink-500">{hint}</p>}
    </Card>
  );
}
