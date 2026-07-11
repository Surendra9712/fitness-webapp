import { RefreshCw, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExerciseCard } from "./ExerciseCard";
import type { ExerciseRec } from "./types";

export function ExerciseTab({
  exercise,
  loading,
  onRefresh,
}: {
  exercise: ExerciseRec | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" />
          Based on today's logged calories — recalculated daily
        </p>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : exercise ? (
        <div className="space-y-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold capitalize">
                    {exercise.category.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {exercise.reason}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 capitalize text-xs">
                  {exercise.scoring_method?.replace(/_/g, " ") ?? "AI"}
                </Badge>
              </div>
              <div className="flex gap-4 text-sm">
                <span>
                  🔥 Consumed: <strong>{Math.round(exercise.today_calories)} kcal</strong>
                </span>
                <span>
                  🎯 Target: <strong>{Math.round(exercise.target_calories)} kcal</strong>
                </span>
              </div>
              {!exercise.exercisedb_configured && (
                <p className="text-xs text-muted-foreground border-t pt-2">
                  ℹ️ Showing static exercise images. Add{" "}
                  <code>EXERCISEDB_API_KEY</code> to .env for animated GIFs.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exercise.exercises.map((ex, i) => (
              <ExerciseCard key={i} ex={ex} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
