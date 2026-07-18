import { useState } from "react";
import { Dumbbell, CheckCircle2 } from "lucide-react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ExerciseItem } from "./types";

export function ExerciseCard({
  ex,
  onComplete,
}: {
  ex: ExerciseItem;
  onComplete?: (result: {
    calories_burned: number;
    exercise_name: string;
  }) => void;
}) {
  const [showInstr, setShowInstr] = useState(false);
  const [duration, setDuration] = useState(30);
  const [completing, setCompleting] = useState(false);
  const [caloriesBurned, setCaloriesBurned] = useState<number | null>(null);
  // ex.is_completed is server-derived from exercise_logs for the effective
  // "today" (see /ai/recommend/exercise) — it naturally resets once the day
  // changes, whether via real rollover or an End Meal Today advance.
  // caloriesBurned is just optimistic feedback until the list refreshes.
  const isCompleted = Boolean(ex.is_completed) || caloriesBurned !== null;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await api.post<{
        calories_burned: number;
        exercise_name: string;
        message: string;
      }>("/ai/exercise/complete", {
        exercise_id: ex.exercise_id,
        exercise_name: ex.name,
        body_part: ex.body_part,
        duration_minutes: duration,
      });
      setCaloriesBurned(res.calories_burned);
      onComplete?.({
        calories_burned: res.calories_burned,
        exercise_name: ex.name,
      });
      // Req 12: Signal dashboard to refresh stats when user navigates back
      localStorage.setItem(
        "smartdiet_exercise_completed",
        Date.now().toString(),
      );
    } catch {
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div
      className={`border rounded-lg overflow-hidden bg-card transition-all ${isCompleted ? "border-emerald-400 bg-emerald-50/30" : ""}`}
    >
      {ex.has_animation && ex.gif_url ? (
        <img
          src={ex.gif_url}
          alt={ex.name}
          className="w-full h-40 object-cover bg-muted"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-40 bg-muted flex items-center justify-center">
          <Dumbbell className="h-12 w-12 text-muted-foreground/50" />
        </div>
      )}
      <div className="p-3 space-y-2">
        <p className="font-semibold text-sm">{ex.name}</p>
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs capitalize">
            {ex.body_part}
          </Badge>
          <Badge variant="outline" className="text-xs capitalize">
            {ex.equipment}
          </Badge>
          {ex.difficulty && (
            <Badge variant="outline" className="text-xs capitalize">
              {ex.difficulty}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Target: {ex.target_muscle}
        </p>
        {ex.instructions && ex.instructions.length > 0 && (
          <div>
            <button
              className="text-xs text-primary underline"
              onClick={() => setShowInstr((v) => !v)}
            >
              {showInstr ? "Hide instructions" : "Show instructions"}
            </button>
            {showInstr && (
              <ol className="mt-2 space-y-1">
                {ex.instructions.map((step, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground flex gap-2"
                  >
                    <span className="font-bold shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {isCompleted ? (
          <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-lg px-3 py-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Completed today
            {caloriesBurned !== null ? ` — ~${caloriesBurned} kcal burned` : ""}
          </div>
        ) : (
          <div className="space-y-2 pt-1 border-t">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">
                Duration (min):
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-16 h-7 text-xs border rounded px-2 bg-background"
              />
            </div>
            <Button
              onClick={handleComplete}
              disabled={completing}
              className="w-full gap-1.5"
            >
              {completing ? (
                "Logging..."
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Exercise
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
