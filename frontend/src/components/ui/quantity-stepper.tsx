import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  size = "md",
  className,
}: QuantityStepperProps) {
  const btnClass = cn(
    "flex items-center justify-center rounded-md border border-border bg-background text-foreground cursor-pointer hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
    size === "sm" ? "h-7 w-7" : "h-8 w-8",
  );
  const iconClass = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const valClass = cn(
    "text-center font-semibold tabular-nums",
    size === "sm" ? "w-8 text-sm" : "w-10 text-sm",
  );

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        className={btnClass}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className={iconClass} />
      </button>

      <span className={valClass}>{value}</span>

      <button
        type="button"
        className={btnClass}
        onClick={() =>
          onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)
        }
        disabled={max !== undefined && value >= max}
        aria-label="Increase quantity"
      >
        <Plus className={iconClass} />
      </button>
    </div>
  );
}
