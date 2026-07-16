import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FoodCard } from "./FoodCard";
import type { FoodResult } from "./types";

export function FoodSearchTab({
  query,
  results,
  searching,
  onSearch,
}: {
  query: string;
  results: FoodResult[];
  searching: boolean;
  onSearch: (q: string) => void;
}) {
  return (
    <div className="space-y-4 mt-4">
      <p className="text-sm text-muted-foreground">
        Search any food — Nepali dishes, global cuisine, branded foods.
        Searches Nepali knowledge base → USDA → Nutritionix automatically.
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="e.g. daal bhat, chicken curry, sushi..."
          value={query}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      {searching && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border rounded-lg p-3 bg-card space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-6" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Skeleton className="h-4 w-12 rounded-full" />
                <Skeleton className="h-4 w-10 rounded-full" />
                <Skeleton className="h-4 w-10 rounded-full" />
                <Skeleton className="h-4 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((food, i) => (
            <FoodCard key={i} food={food} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
