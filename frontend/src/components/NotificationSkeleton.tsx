import { Skeleton } from "@/components/ui/skeleton";

interface NotificationSkeletonProps {
  count?: number;
}

export function NotificationSkeleton({ count = 4 }: NotificationSkeletonProps) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-start justify-between rounded-xl border bg-background p-4 shadow-sm"
        >
          <div className="flex flex-1 gap-3">
            {/* Icon */}
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />

            {/* Content */}
            <div className="flex-1 space-y-2">
              {/* Title */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-72" />
                <Skeleton className="h-2 w-2 rounded-full" />
              </div>

              {/* Description */}
              <Skeleton className="h-3 w-[420px]" />

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>

          {/* Time */}
          <Skeleton className="ml-8 h-4 w-28 shrink-0" />
        </div>
      ))}
    </div>
  );
}
