import {
  RefreshCw,
  Flame,
  Leaf,
  Sunrise,
  Sun,
  Apple,
  Moon,
  Nut,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FoodCard } from "./FoodCard";
import type { MealRecommendation } from "./types";

const MEAL_LABELS: Record<
  string,
  { label: string; icon: LucideIcon; class: string }
> = {
  breakfast: { label: "Breakfast", icon: Sunrise, class: "Light" },
  lunch: { label: "Lunch", icon: Sun, class: "Heavy" },
  snack: { label: "Snack", icon: Apple, class: "Light" },
  dinner: { label: "Dinner", icon: Moon, class: "Heavy" },
};

export function MealPlanTab({
  mealPlan,
  loading,
  onRefresh,
}: {
  mealPlan: Record<string, MealRecommendation> | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Breakfast &amp; snack ={" "}
          <span className="font-medium text-primary">light</span>{" "}
          &nbsp;•&nbsp; Lunch &amp; dinner ={" "}
          <span className="font-medium text-orange-500">heavy</span>
        </p>
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
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-28 mt-1" />
              </CardHeader>
              <CardContent className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="border rounded-lg p-3 bg-card space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Skeleton className="h-4 w-10 rounded-full" />
                      <Skeleton className="h-4 w-10 rounded-full" />
                      <Skeleton className="h-4 w-10 rounded-full" />
                      <Skeleton className="h-4 w-10 rounded-full" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : mealPlan ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {(["breakfast", "lunch", "snack", "dinner"] as const).map((mt) => {
            const rec = mealPlan[mt];
            if (!rec) return null;
            const info = MEAL_LABELS[mt];
            const isLight = info.class === "Light";
            return (
              <Card key={mt} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <info.icon className="h-4 w-4 text-muted-foreground" />
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
                        <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                          <Nut className="h-3 w-3 shrink-0" />
                          Recommended dry fruits (add-on)
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {rec.dry_fruits_addon.map((df) => (
                            <span
                              key={df.name}
                              className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full"
                            >
                              {df.name} — {df.grams}g (
                              {df.calories_per_serving} kcal)
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
    </div>
  );
}
