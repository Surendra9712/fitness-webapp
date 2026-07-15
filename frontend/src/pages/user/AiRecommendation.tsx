import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Sparkles,
  Dumbbell,
  Utensils,
  Search,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lock,
  Flame,
  Leaf,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MealPlanTab } from "./ai-recommendation/MealPlanTab";
import { ExerciseTab } from "./ai-recommendation/ExerciseTab";
import { FoodSearchTab } from "./ai-recommendation/FoodSearchTab";
import { AskAiTab } from "./ai-recommendation/AskAiTab";
import type {
  ExerciseRec,
  MealRecommendation,
} from "./ai-recommendation/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  dry_fruits_addon?: {
    name: string;
    grams: number;
    calories_per_serving: number;
  }[];
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
const MEAL_LABELS: Record<
  string,
  { label: string; emoji: string; class: string }
> = {
  breakfast: { label: "Breakfast", emoji: "🌅", class: "Light" },
  lunch: { label: "Lunch", emoji: "☀️", class: "Heavy" },
  snack: { label: "Snack", emoji: "🍎", class: "Light" },
  dinner: { label: "Dinner", emoji: "🌙", class: "Heavy" },
};

function MacroPill({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${color}`}
    >
      <span className="font-semibold">{label}</span>
      <span>
        {Math.round(value)}
        {unit}
      </span>
    </span>
  );
}

function FoodCard({
  food,
  rank,
}: {
  food: FoodResult & { ai_score?: number };
  rank: number;
}) {
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
                per {food.serving_size}
                {food.serving_unit || "g"}
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

function ExerciseCard({
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
  const [done, setDone] = useState(false);
  const [caloriesBurned, setCaloriesBurned] = useState<number | null>(null);

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
      setDone(true);
      onComplete?.({
        calories_burned: res.calories_burned,
        exercise_name: ex.name,
      });
    } catch {
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div
      className={`border rounded-lg overflow-hidden bg-card transition-all ${done ? "border-emerald-400 bg-emerald-50/30" : ""}`}
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

        {done ? (
          <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-lg px-3 py-2 text-sm font-medium">
            ✅ Completed! ~{caloriesBurned} kcal burned
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
            <button
              onClick={handleComplete}
              disabled={completing}
              className="w-full py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors"
            >
              {completing ? "Logging..." : "✓ Complete Exercise"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AiRecommendation() {
  const { user } = useAuth();
  const isPro =
    user?.subscription_plan === "pro" && user?.subscription_status === "active";
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "meals";

  const [mealPlan, setMealPlan] = useState<Record<
    string,
    MealRecommendation
  > | null>(null);
  const [exercise, setExercise] = useState<ExerciseRec | null>(null);
  const [loadingMeal, setLoadingMeal] = useState(false);
  const [loadingEx, setLoadingEx] = useState(false);
  const [error, setError] = useState("");
  const [exerciseCompleted, setExerciseCompleted] = useState<
    { calories_burned: number; exercise_name: string }[]
  >([]);

  const loadMealPlan = async () => {
    setLoadingMeal(true);
    setError("");
    try {
      const res = await api.get<{
        meal_plan: Record<string, MealRecommendation>;
      }>("/ai/recommend/meal");
      setMealPlan(res.meal_plan);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMeal(false);
    }
  };

  const loadExercise = async () => {
    setLoadingEx(true);
    setError("");
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

  if (!isPro) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center max-w-md mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Pro Feature</h2>
        <p className="text-sm text-muted-foreground">
          AI Recommendations are available exclusively on the Pro plan. Upgrade
          to unlock personalised meal plans, exercise recommendations with
          animated GIFs, food search, and natural language logging.
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
            <p className="text-sm text-muted-foreground">
              Personalised meal plans &amp; animated exercise recommendations
              powered by AI
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="meals">🍽️ Meal Plan</TabsTrigger>
          <TabsTrigger value="exercise">🏋️ Exercise</TabsTrigger>
          <TabsTrigger value="search">🔍 Food Search</TabsTrigger>
          <TabsTrigger value="nlp">💬 Ask AI</TabsTrigger>
        </TabsList>

        <TabsContent value="meals" className="mt-4">
          <MealPlanTab
            mealPlan={mealPlan}
            loading={loadingMeal}
            onRefresh={loadMealPlan}
            onError={setError}
          />
        </TabsContent>

        {/* ── EXERCISE TAB ──────────────────────────────────── */}
        <TabsContent value="exercise" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div />
            <Button
              variant="outline"
              size="sm"
              onClick={loadExercise}
              disabled={loadingEx}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${loadingEx ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {loadingEx ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-64 rounded-xl bg-muted animate-pulse"
                />
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
                      <p className="text-sm text-muted-foreground mt-1">
                        {exercise.reason}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 capitalize text-xs"
                    >
                      {exercise.scoring_method?.replace(/_/g, " ") ?? "AI"}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span>
                      🔥 Consumed:{" "}
                      <strong>
                        {Math.round(exercise.today_calories)} kcal
                      </strong>
                    </span>
                    <span>
                      🎯 Target:{" "}
                      <strong>
                        {Math.round(exercise.target_calories)} kcal
                      </strong>
                    </span>
                  </div>
                  {!exercise.exercisedb_configured && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      ℹ️ Add <code>EXERCISEDB_API_KEY</code> to .env to enable
                      real animated GIFs from ExerciseDB.
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {exercise.exercises.map((ex, i) => (
                  <ExerciseCard
                    key={i}
                    ex={ex}
                    onComplete={(result) => {
                      // Show a quick toast-style notification
                      setExerciseCompleted((prev) => [...prev, result]);
                    }}
                  />
                ))}
                {exerciseCompleted.length > 0 && (
                  <div className="col-span-full bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-emerald-700 mb-2">
                      ✅ Exercises completed today:
                    </p>
                    {exerciseCompleted.map((r, i) => (
                      <p key={i} className="text-xs text-emerald-600">
                        • {r.exercise_name}: ~{r.calories_burned} kcal burned
                      </p>
                    ))}
                    <p className="text-xs font-bold text-emerald-700 mt-2 border-t border-emerald-200 pt-2">
                      Total burned: ~
                      {exerciseCompleted.reduce(
                        (s, r) => s + r.calories_burned,
                        0,
                      )}{" "}
                      kcal
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <FoodSearchTab />
        </TabsContent>

        <TabsContent value="nlp" className="mt-4">
          <AskAiTab onError={setError} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
