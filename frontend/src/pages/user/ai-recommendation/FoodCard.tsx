import { Badge } from "@/components/ui/badge";
import { MacroPill } from "./MacroPill";
import type { FoodResult } from "./types";

function formatServing(size: number, unit?: string) {
  // Some knowledge-base entries already embed a quantity in serving_unit
  // (e.g. "1 cup", "1 full plate") rather than a bare unit like "g" or "ml".
  if (unit && /^\d/.test(unit)) return `${unit} (${size}g)`;
  return `${size}${unit || "g"}`;
}

export function FoodCard({
  food,
  rank,
}: {
  food: FoodResult & { ai_score?: number };
  rank: number;
}) {
  return (
    <div className="border rounded-lg p-3 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg font-bold text-primary">#{rank}</span>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{food.name}</p>
            {food.serving_size && (
              <p className="text-xs text-muted-foreground">
                per {formatServing(food.serving_size, food.serving_unit)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {food.ai_score !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {Math.round(Math.min(1, Math.max(0, food.ai_score)) * 100)}% match
            </Badge>
          )}
          {food.source && (
            <Badge variant="outline" className="text-xs capitalize">
              {food.source}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        <MacroPill
          label="Cal"
          value={food.calories}
          unit=" kcal"
          color="bg-orange-100 text-orange-700"
        />
        <MacroPill
          label="P"
          value={food.protein_g}
          unit="g"
          color="bg-blue-100 text-blue-700"
        />
        <MacroPill
          label="C"
          value={food.carbs_g}
          unit="g"
          color="bg-green-100 text-green-700"
        />
        <MacroPill
          label="F"
          value={food.fat_g}
          unit="g"
          color="bg-yellow-100 text-yellow-700"
        />
        {(food.fiber_g ?? 0) > 0 && (
          <MacroPill
            label="Fiber"
            value={food.fiber_g!}
            unit="g"
            color="bg-purple-100 text-purple-700"
          />
        )}
      </div>
    </div>
  );
}
