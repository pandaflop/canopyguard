import { Badge } from "@/components/ui/Badge";
import type { RiskClassification } from "@/lib/types";
import { cn } from "@/lib/utils";

export const RISK_LABEL: Record<RiskClassification, string> = {
  low: "Low risk",
  monitor: "Monitor",
  investigate: "Investigate",
  escalate: "Escalate",
};

export function RiskBadge({
  classification,
  score,
  size = "md",
  className,
}: {
  classification: RiskClassification;
  score?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <Badge
      tone={classification}
      dot
      className={cn(size === "sm" && "text-[10px] px-1.5 py-0.5", className)}
    >
      {RISK_LABEL[classification]}
      {typeof score === "number" && (
        <span className="font-mono tabular-nums opacity-75">· {score}</span>
      )}
    </Badge>
  );
}
