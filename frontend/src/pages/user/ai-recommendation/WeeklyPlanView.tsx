import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MEAL_LABELS } from "./constants";
import type { WeeklyPlanResponse } from "./types";

const DAY_NUMBERS = Array.from({ length: 7 }, (_, i) => i + 1);

export function WeeklyPlanView({
  onError,
}: {
  onError: (message: string) => void;
}) {
  const [plan, setPlan] = useState<WeeklyPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeDay, setActiveDay] = useState(1);

  const loadWeeklyPlan = async () => {
    setLoading(true);
    try {
      const res = await api.get<WeeklyPlanResponse>("/ai/plan/weekly");
      setPlan(res);
      setActiveDay(1);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeeklyPlan();
  }, []);

  const dayPlan = plan?.weekly_plan[`day_${activeDay}`];
  const mealTypes = dayPlan ? Object.keys(dayPlan) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          A fresh pick for each meal across the next 7 days, varied so you
          don't get the same dish twice in a row.
        </p>
        <Button variant="outline" size="sm" onClick={loadWeeklyPlan} disabled={loading}>
          Regenerate
        </Button>
      </div>

      {loading ? (
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      ) : dayPlan ? (
        <>
          <div className="flex flex-wrap gap-1">
            {DAY_NUMBERS.map((d) => (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  d === activeDay
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted border-border"
                }`}
              >
                Day {d}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {mealTypes.map((mt) => {
              const slot = dayPlan[mt];
              const info = MEAL_LABELS[mt] ?? { label: mt, emoji: "🍽️" };
              return (
                <div key={mt} className="border rounded-lg p-3 bg-card">
                  <p className="font-medium text-sm flex items-center gap-1.5 mb-2">
                    <span>{info.emoji}</span>
                    {info.label}
                  </p>
                  {slot.chosen ? (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm truncate">{slot.chosen.name}</p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {Math.round(slot.chosen.calories)} kcal
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No suggestion available
                    </p>
                  )}
                  {slot.alternatives.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      Alt: {slot.alternatives.map((a) => a.name).join(", ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
