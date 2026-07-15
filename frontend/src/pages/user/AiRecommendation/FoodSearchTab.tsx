import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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
        <p className="text-sm text-muted-foreground">Searching...</p>
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
