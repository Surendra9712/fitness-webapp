import { useState } from "react";
import { Send } from "lucide-react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FoodCard } from "./FoodCard";
import type { NlpQueryResponse } from "./types";

export function AskAiTab({ onError }: { onError: (message: string) => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<NlpQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post<NlpQueryResponse>("/ai/nlp/query", { text });
      setResult(res);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tell the AI what you ate or ask for a recommendation in plain English.
        Examples: "I ate chiya and pauroti for breakfast" — "suggest high
        protein lunch"
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="I ate daal bhat and chicken curry..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
        />
        <Button onClick={handleAsk} disabled={loading || !text.trim()}>
          <Send className="h-4 w-4 mr-1" />
          {loading ? "..." : "Ask"}
        </Button>
      </div>

      {result && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              AI detected: {result.nlp_analysis.intent}
              {(result.nlp_analysis.foods_detected?.length ?? 0) > 0 && (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  — {result.nlp_analysis.foods_detected!.join(", ")}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.result.type === "logged_meal_nutrition" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Nutrition totals:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.result.totals).map(([k, v]) => (
                    <Badge key={k} variant="secondary" className="text-xs">
                      {k}: {v}
                    </Badge>
                  ))}
                </div>
                {result.result.items.map((food, i) => (
                  <FoodCard key={i} food={food} rank={i + 1} />
                ))}
              </div>
            )}
            {result.result.type === "recommendation" && (
              <div className="space-y-2">
                {result.result.options.map((food, i) => (
                  <FoodCard key={i} food={food} rank={i + 1} />
                ))}
              </div>
            )}
            {result.result.type === "nutrition_info" && (
              <div className="space-y-2">
                {result.result.foods.map((food, i) => (
                  <FoodCard key={i} food={food} rank={i + 1} />
                ))}
              </div>
            )}
            {(result.result.type === "not_found" ||
              result.result.type === "unrecognized") && (
              <p className="text-sm text-muted-foreground">
                {result.result.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
