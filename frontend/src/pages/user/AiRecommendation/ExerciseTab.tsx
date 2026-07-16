import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseCard } from "./ExerciseCard";
import type { ExerciseRec } from "./types";

export function ExerciseTab({
  exercise,
  loading,
  onRefresh,
  completed,
  onExerciseComplete,
}: {
  exercise: ExerciseRec | null;
  loading: boolean;
  onRefresh: () => void;
  completed: { calories_burned: number; exercise_name: string }[];
  onExerciseComplete: (result: {
    calories_burned: number;
    exercise_name: string;
  }) => void;
}) {
  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div />
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg overflow-hidden bg-card">
              <Skeleton className="w-full h-40 rounded-none" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-32" />
                <div className="flex flex-wrap gap-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full rounded-md mt-1" />
              </div>
            </div>
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
                  🔥 Consumed:{" "}
                  <strong>{Math.round(exercise.today_calories)} kcal</strong>
                </span>
                <span>
                  🎯 Target:{" "}
                  <strong>{Math.round(exercise.target_calories)} kcal</strong>
                </span>
              </div>
              {!exercise.exercisedb_configured && (
                <p className="text-xs text-muted-foreground border-t pt-2">
                  ℹ️ Add <code>EXERCISEDB_API_KEY</code> to .env to enable real
                  animated GIFs from ExerciseDB.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exercise.exercises.map((ex, i) => (
              <ExerciseCard
                key={i}
                ex={ex}
                onComplete={onExerciseComplete}
                onRefreshExercise={onRefresh}
              />
            ))}
            {completed.length > 0 && (
              <div className="col-span-full bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-emerald-700 mb-2">
                  ✅ Exercises completed today:
                </p>
                {completed.map((r, i) => (
                  <p key={i} className="text-xs text-emerald-600">
                    • {r.exercise_name}: ~{r.calories_burned} kcal burned
                  </p>
                ))}
                <p className="text-xs font-bold text-emerald-700 mt-2 border-t border-emerald-200 pt-2">
                  Total burned: ~
                  {completed.reduce((s, r) => s + r.calories_burned, 0)} kcal
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
