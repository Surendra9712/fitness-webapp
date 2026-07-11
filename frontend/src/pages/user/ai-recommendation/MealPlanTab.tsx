import { useState } from "react";
import { RefreshCw, Flame, Leaf, CalendarDays, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FoodCard } from "./FoodCard";
import { WeeklyPlanView } from "./WeeklyPlanView";
import { MEAL_LABELS } from "./constants";
import type { MealRecommendation } from "./types";

const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"] as const;

export function MealPlanTab({
  mealPlan,
  loading,
  onRefresh,
  onError,
}: {
  mealPlan: Record<string, MealRecommendation> | null;
  loading: boolean;
  onRefresh: () => void;
  onError: (message: string) => void;
}) {
  const [scope, setScope] = useState<"daily" | "weekly">("daily");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
        <button
          onClick={() => setScope("daily")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            scope === "daily"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          Today
        </button>
        <button
          onClick={() => setScope("weekly")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            scope === "weekly"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarRange className="h-4 w-4" />
          7-Day Plan
        </button>
      </div>

      {scope === "weekly" ? (
        <WeeklyPlanView onError={onError} />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Breakfast &amp; snack ={" "}
              <span className="font-medium text-primary">light</span>{" "}
              &nbsp;•&nbsp; Lunch &amp; dinner ={" "}
              <span className="font-medium text-orange-500">heavy</span>
            </p>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : mealPlan ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {MEAL_TYPES.map((mt) => {
                const rec = mealPlan[mt];
                if (!rec) return null;
                const info = MEAL_LABELS[mt];
                const isLight = info.class === "Light";
                return (
                  <Card key={mt} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <span>{info.emoji}</span>
                          {info.label}
                        </CardTitle>
                        <Badge
                          variant={isLight ? "secondary" : "default"}
                          className={`text-xs ${isLight ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}
                        >
                          {isLight ? (
                            <>
                              <Leaf className="h-3 w-3 mr-1" />
                              Light
                            </>
                          ) : (
                            <>
                              <Flame className="h-3 w-3 mr-1" />
                              Heavy
                            </>
                          )}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Target: ~{rec.target?.calories ?? 0} kcal
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {rec.recommendations.slice(0, 3).map((food, i) => (
                        <FoodCard key={i} food={food} rank={i + 1} />
                      ))}
                      {mt === "breakfast" &&
                        rec.dry_fruits_addon &&
                        rec.dry_fruits_addon.length > 0 && (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-xs font-semibold text-amber-700 mb-1">
                              🌰 Recommended dry fruits (add-on)
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {rec.dry_fruits_addon.map((df) => (
                                <span
                                  key={df.name}
                                  className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full"
                                >
                                  {df.name} — {df.grams}g ({df.calories_per_serving} kcal)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
