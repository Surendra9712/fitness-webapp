import { CalendarDays } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

/**
 * The day a page's data belongs to, as decided by the server.
 *
 * Always render the date the API returned rather than the browser's clock —
 * the backend can be running a simulated day (dev mode / after "End Meal
 * Today"), and the plan on screen belongs to that day, not to real "today".
 */
export function PageDate({
  date,
  label = "Today",
  className,
}: {
  date?: string | null;
  label?: string;
  className?: string;
}) {
  if (!date) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
      <span>
        {label} ·{" "}
        <span className="text-foreground">
          {formatDate({ date, format: "dddd, D MMMM YYYY" })}
        </span>
      </span>
    </span>
  );
}
