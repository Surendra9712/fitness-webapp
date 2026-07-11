import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/api/client";
import { Input } from "@/components/ui/input";
import { FoodCard } from "./FoodCard";
import type { FoodResult } from "./types";

const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

export function FoodSearchTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get<{ results: FoodResult[] }>(
          `/ai/food/search?q=${encodeURIComponent(q)}`,
        );
        setResults(res.results);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  };

  return (
    <div className="space-y-4">
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
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      {searching && <p className="text-sm text-muted-foreground">Searching...</p>}
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
