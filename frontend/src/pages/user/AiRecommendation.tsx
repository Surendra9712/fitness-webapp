import { useEffect, useState, useRef } from "react";
import {
  Sparkles, Dumbbell, Utensils, Search, Send, RefreshCw,
  ChevronDown, ChevronUp, Lock, Flame, Leaf,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FoodResult {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  serving_size?: number;
  serving_unit?: string;
  source?: string;
}

interface MealRecommendation {
  meal_type: string;
  meal_class: string;
  recommendations: (FoodResult & { ai_score?: number })[];
  dry_fruits_addon?: { name: string; grams: number; calories_per_serving: number }[];
}

interface ExerciseItem {
  name: string;
  body_part: string;
  target_muscle: string;
  equipment: string;
  gif_url: string;
  has_animation: boolean;
  instructions: string[];
  difficulty: string;
}

interface ExerciseRec {
  category: string;
  reason: string;
  scoring_method: string;
  exercises: ExerciseItem[];
  today_calories: number;
  target_calories: number;
  calorie_ratio: number;
  exercisedb_configured: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const MEAL_LABELS: Record<string, { label: string; emoji: string; class: string }> = {
  breakfast: { label: "Breakfast", emoji: "🌅", class: "Light" },
  lunch:     { label: "Lunch",     emoji: "☀️", class: "Heavy" },
  snack:     { label: "Snack",     emoji: "🍎", class: "Light" },
  dinner:    { label: "Dinner",    emoji: "🌙", class: "Heavy" },
};

function MacroPill({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${color}`}>
      <span className="font-semibold">{label}</span>
      <span>{Math.round(value)}{unit}</span>
    </span>
  );
}

function FoodCard({ food, rank }: { food: FoodResult & { ai_score?: number }; rank: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg p-3 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg font-bold text-primary">#{rank}</span>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{food.name}</p>
            {food.serving_size && (
              <p className="text-xs text-muted-foreground">
                per {food.serving_size}{food.serving_unit || "g"}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {food.ai_score !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {Math.round(food.ai_score * 100)}% match
            </Badge>
          )}
          {food.source && (
            <Badge variant="outline" className="text-xs capitalize">{food.source}</Badge>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        <MacroPill label="Cal" value={food.calories} unit=" kcal" color="bg-orange-100 text-orange-700" />
        <MacroPill label="P" value={food.protein_g} unit="g" color="bg-blue-100 text-blue-700" />
        <MacroPill label="C" value={food.carbs_g} unit="g" color="bg-green-100 text-green-700" />
        <MacroPill label="F" value={food.fat_g} unit="g" color="bg-yellow-100 text-yellow-700" />
        {(food.fiber_g ?? 0) > 0 && (
          <MacroPill label="Fiber" value={food.fiber_g!} unit="g" color="bg-purple-100 text-purple-700" />
        )}
      </div>
    </div>
  );
}

function ExerciseCard({ ex }: { ex: ExerciseItem }) {
  const [showInstr, setShowInstr] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
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
      <div className="p-3 space-y-1">
        <p className="font-semibold text-sm">{ex.name}</p>
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs capitalize">{ex.body_part}</Badge>
          <Badge variant="outline" className="text-xs capitalize">{ex.equipment}</Badge>
          {ex.difficulty && (
            <Badge variant="outline" className="text-xs capitalize">{ex.difficulty}</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Target: {ex.target_muscle}</p>
        {ex.instructions && ex.instructions.length > 0 && (
          <div>
            <button
              className="text-xs text-primary underline mt-1"
              onClick={() => setShowInstr(v => !v)}
            >
              {showInstr ? "Hide instructions" : "Show instructions"}
            </button>
            {showInstr && (
              <ol className="mt-2 space-y-1">
                {ex.instructions.map((step, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="font-bold shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AiRecommendation() {
  const { user } = useAuth();
  const isPro = user?.subscription_plan === "pro" && user?.subscription_status === "active";

  const [mealPlan, setMealPlan] = useState<Record<string, MealRecommendation> | null>(null);
  const [exercise, setExercise] = useState<ExerciseRec | null>(null);
  const [loadingMeal, setLoadingMeal] = useState(false);
  const [loadingEx, setLoadingEx] = useState(false);
  const [error, setError] = useState("");

  // Food search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // NLP query
  const [nlpText, setNlpText] = useState("");
  const [nlpResult, setNlpResult] = useState<Record<string, unknown> | null>(null);
  const [nlpLoading, setNlpLoading] = useState(false);

  const loadMealPlan = async () => {
    setLoadingMeal(true);
    setError("");
    try {
      const res = await api.get<{ meal_plan: Record<string, MealRecommendation> }>("/ai/recommend/meal");
      setMealPlan(res.meal_plan);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMeal(false);
    }
  };

  const loadExercise = async () => {
    setLoadingEx(true);
    try {
      const res = await api.get<ExerciseRec>("/ai/recommend/exercise");
      setExercise(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingEx(false);
    }
  };

  useEffect(() => {
    if (isPro) {
      loadMealPlan();
      loadExercise();
    }
  }, [isPro]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get<{ results: FoodResult[] }>(`/ai/food/search?q=${encodeURIComponent(q)}`);
        setSearchResults(res.results);
      } catch {} finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleNlpQuery = async () => {
    if (!nlpText.trim()) return;
    setNlpLoading(true);
    setNlpResult(null);
    try {
      const res = await api.post<Record<string, unknown>>("/ai/nlp/query", { text: nlpText });
      setNlpResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setNlpLoading(false);
    }
  };

  if (!isPro) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center max-w-md mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Pro Feature</h2>
        <p className="text-sm text-muted-foreground">
          AI Recommendations are available exclusively on the Pro plan.
          Upgrade to unlock personalised meal plans, exercise recommendations
          with animated GIFs, food search, and natural language logging.
        </p>
        <Button asChild className="mt-2">
          <Link to="/customer/subscription">Upgrade to Pro</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Recommendations</h1>
            <p className="text-sm text-muted-foreground">
              Personalised meal plans &amp; animated exercise recommendations powered by AI
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="meals">
        <TabsList>
          <TabsTrigger value="meals">🍽️ Meal Plan</TabsTrigger>
          <TabsTrigger value="exercise">🏋️ Exercise</TabsTrigger>
          <TabsTrigger value="search">🔍 Food Search</TabsTrigger>
          <TabsTrigger value="nlp">💬 Ask AI</TabsTrigger>
        </TabsList>

        {/* ── MEAL PLAN TAB ─────────────────────────────────── */}
        <TabsContent value="meals" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Breakfast &amp; snack = <span className="font-medium text-primary">light</span> &nbsp;•&nbsp;
              Lunch &amp; dinner = <span className="font-medium text-orange-500">heavy</span>
            </p>
            <Button variant="outline" size="sm" onClick={loadMealPlan} disabled={loadingMeal}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingMeal ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loadingMeal ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : mealPlan ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {(["breakfast", "lunch", "snack", "dinner"] as const).map(mt => {
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
                          {isLight ? <><Leaf className="h-3 w-3 mr-1" />Light</> : <><Flame className="h-3 w-3 mr-1" />Heavy</>}
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
                      {mt === "breakfast" && rec.dry_fruits_addon && rec.dry_fruits_addon.length > 0 && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs font-semibold text-amber-700 mb-1">
                            🌰 Recommended dry fruits (add-on)
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {rec.dry_fruits_addon.map(df => (
                              <span key={df.name} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
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
        </TabsContent>

        {/* ── EXERCISE TAB ──────────────────────────────────── */}
        <TabsContent value="exercise" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div />
            <Button variant="outline" size="sm" onClick={loadExercise} disabled={loadingEx}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingEx ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loadingEx ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
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
                      <p className="text-sm text-muted-foreground mt-1">{exercise.reason}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 capitalize text-xs">
                      {exercise.scoring_method?.replace(/_/g, " ") ?? "AI"}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span>🔥 Consumed: <strong>{Math.round(exercise.today_calories)} kcal</strong></span>
                    <span>🎯 Target: <strong>{Math.round(exercise.target_calories)} kcal</strong></span>
                  </div>
                  {!exercise.exercisedb_configured && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      ℹ️ Add <code>EXERCISEDB_API_KEY</code> to .env to enable real animated GIFs from ExerciseDB.
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {exercise.exercises.map((ex, i) => (
                  <ExerciseCard key={i} ex={ex} />
                ))}
              </div>
            </div>
          ) : null}
        </TabsContent>

        {/* ── FOOD SEARCH TAB ───────────────────────────────── */}
        <TabsContent value="search" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Search any food — Nepali dishes, global cuisine, branded foods.
            Searches Nepali knowledge base → USDA → Nutritionix automatically.
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="e.g. daal bhat, chicken curry, sushi..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          {searching && <p className="text-sm text-muted-foreground">Searching...</p>}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((food, i) => (
                <FoodCard key={i} food={food} rank={i + 1} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ASK AI / NLP TAB ──────────────────────────────── */}
        <TabsContent value="nlp" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Tell the AI what you ate or ask for a recommendation in plain English.
            Examples: "I ate chiya and pauroti for breakfast" — "suggest high protein lunch"
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="I ate daal bhat and chicken curry..."
              value={nlpText}
              onChange={e => setNlpText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleNlpQuery()}
            />
            <Button onClick={handleNlpQuery} disabled={nlpLoading || !nlpText.trim()}>
              <Send className="h-4 w-4 mr-1" />
              {nlpLoading ? "..." : "Ask"}
            </Button>
          </div>

          {nlpResult && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  AI detected: {(nlpResult.nlp_analysis as Record<string, unknown>)?.intent as string}
                  {((nlpResult.nlp_analysis as Record<string, unknown>)?.foods_detected as string[])?.length > 0 && (
                    <span className="font-normal text-muted-foreground">
                      {" "}— {((nlpResult.nlp_analysis as Record<string, unknown>)?.foods_detected as string[]).join(", ")}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nlpResult.result && (nlpResult.result as Record<string, unknown>).type === "logged_meal_nutrition" && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Nutrition totals:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries((nlpResult.result as Record<string, unknown>).totals as Record<string, number>).map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-xs">
                          {k}: {v}
                        </Badge>
                      ))}
                    </div>
                    {((nlpResult.result as Record<string, unknown>).items as FoodResult[])?.map((food, i) => (
                      <FoodCard key={i} food={food} rank={i + 1} />
                    ))}
                  </div>
                )}
                {nlpResult.result && (nlpResult.result as Record<string, unknown>).type === "recommendation" && (
                  <div className="space-y-2">
                    {((nlpResult.result as Record<string, unknown>).options as FoodResult[])?.map((food, i) => (
                      <FoodCard key={i} food={food} rank={i + 1} />
                    ))}
                  </div>
                )}
                {nlpResult.result && (nlpResult.result as Record<string, unknown>).type === "not_found" && (
                  <p className="text-sm text-muted-foreground">
                    {(nlpResult.result as Record<string, unknown>).message as string}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
