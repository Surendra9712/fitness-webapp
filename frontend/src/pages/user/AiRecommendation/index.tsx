import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Sparkles, Lock, Utensils, Dumbbell, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MealPlanTab } from "./MealPlanTab";
import { ExerciseTab } from "./ExerciseTab";
import { FoodSearchTab } from "./FoodSearchTab";
import { AskAiTab } from "./AskAiTab";
import type {
  MealRecommendation,
  ExerciseRec,
  FoodResult,
  NlpResponse,
} from "./types";

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

  // Food search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // NLP query
  const [nlpText, setNlpText] = useState("");
  const [nlpResult, setNlpResult] = useState<NlpResponse | null>(null);
  const [nlpLoading, setNlpLoading] = useState(false);

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

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get<{ results: FoodResult[] }>(
          `/ai/food/search?q=${encodeURIComponent(q)}`,
        );
        setSearchResults(res.results);
      } catch {
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleNlpQuery = async () => {
    if (!nlpText.trim()) return;
    setNlpLoading(true);
    setNlpResult(null);
    try {
      const res = await api.post<NlpResponse>("/ai/nlp/query", {
        text: nlpText,
      });
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
          AI Recommendations are available exclusively on the Pro plan. Upgrade
          to unlock personalised meal plans, exercise recommendations with
          animated GIFs, food search, and natural language logging.
        </p>
        <Button asChild className="mt-2">
          <Link to="/trainee/subscription">Upgrade to Pro</Link>
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
          <TabsTrigger value="meals" className="flex gap-2">
            {" "}
            <Utensils size={14} />
            Meal Plan
          </TabsTrigger>
          <TabsTrigger value="exercise" className="flex gap-2">
            {" "}
            <Dumbbell size={14} />
            Exercise
          </TabsTrigger>
          <TabsTrigger value="search" className="flex gap-2">
            <Search size={14} />
            Food Search
          </TabsTrigger>
          {/* <TabsTrigger value="nlp">Ask AI</TabsTrigger> */}
        </TabsList>

        <TabsContent value="meals">
          <MealPlanTab
            mealPlan={mealPlan}
            loading={loadingMeal}
            onRefresh={loadMealPlan}
          />
        </TabsContent>

        <TabsContent value="exercise">
          <ExerciseTab
            exercise={exercise}
            loading={loadingEx}
            onRefresh={loadExercise}
            completed={exerciseCompleted}
            onExerciseComplete={(result) => {
              setExerciseCompleted((prev) => [...prev, result]);
              setExercise((prev) =>
                prev
                  ? {
                      ...prev,
                      exercises: prev.exercises.map((e) =>
                        e.name === result.exercise_name
                          ? { ...e, is_completed: true }
                          : e,
                      ),
                    }
                  : prev,
              );
            }}
          />
        </TabsContent>

        <TabsContent value="search">
          <FoodSearchTab
            query={searchQuery}
            results={searchResults}
            searching={searching}
            onSearch={handleSearch}
          />
        </TabsContent>

        <TabsContent value="nlp">
          <AskAiTab
            text={nlpText}
            onTextChange={setNlpText}
            result={nlpResult}
            loading={nlpLoading}
            onSubmit={handleNlpQuery}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
