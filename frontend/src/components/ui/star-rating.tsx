import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

export function StarRating({
  value,
  onChange,
  max = 5,
  size = "md",
  className,
}: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const interactive = !!onChange;
  const active = hover || value;

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role={interactive ? "radiogroup" : undefined}
      aria-label={interactive ? "Star rating" : `${value} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => {
        const filled = i + 1 <= active;
        return (
          <button
            key={i}
            type="button"
            role={interactive ? "radio" : undefined}
            aria-checked={interactive ? i + 1 === value : undefined}
            aria-label={`${i + 1} star${i + 1 !== 1 ? "s" : ""}`}
            disabled={!interactive}
            onClick={() => interactive && onChange(i + 1)}
            onMouseEnter={() => interactive && setHover(i + 1)}
            onMouseLeave={() => interactive && setHover(0)}
            className={cn(
              "transition-transform",
              interactive
                ? "cursor-pointer hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 rounded"
                : "cursor-default",
              !interactive && "pointer-events-none",
            )}
          >
            <Star
              className={cn(
                SIZE[size],
                filled
                  ? "fill-accent-400 text-accent-400"
                  : "fill-transparent text-muted-foreground/40",
                interactive && !filled && "hover:text-accent-300",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function StarDisplay({
  value,
  count,
  size = "sm",
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <StarRating value={Math.round(value)} max={5} size={size} />
      <span className="text-sm font-semibold text-foreground">
        {value.toFixed(1)}
      </span>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  );
}
