import { Skeleton } from "@/components/ui/skeleton";

interface ListRowSkeletonProps {
  rows?: number;
  avatar?: "circle" | "square" | "none";
  lines?: number;
  actions?: number;
}

export function ListRowSkeleton({
  rows = 5,
  avatar = "circle",
  lines = 2,
  actions = 2,
}: ListRowSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 rounded-xl border bg-background p-4 shadow-sm"
        >
          <div className="flex flex-1 items-center gap-3">
            {avatar !== "none" && (
              <Skeleton
                className={`h-10 w-10 shrink-0 ${avatar === "circle" ? "rounded-full" : "rounded-md"}`}
              />
            )}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              {Array.from({ length: lines }).map((_, j) => (
                <Skeleton key={j} className="h-3 w-56" />
              ))}
            </div>
          </div>
          {actions > 0 && (
            <div className="flex shrink-0 gap-2">
              {Array.from({ length: actions }).map((_, k) => (
                <Skeleton key={k} className="h-8 w-16 rounded-md" />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
