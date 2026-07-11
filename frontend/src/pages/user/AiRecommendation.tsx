import { useEffect, useState } from "react";
import { Sparkles, Lock } from "lucide-react";
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
import type { ExerciseRec, MealRecommendation } from "./ai-recommendation/types";

export default function AiRecommendation() {
  const { user } = useAuth();
  const isPro =
    user?.subscription_plan === "pro" && user?.subscription_status === "active";

  const [mealPlan, setMealPlan] = useState<Record<
    string,
    MealRecommendation
  > | null>(null);
  const [exercise, setExercise] = useState<ExerciseRec | null>(null);
  const [loadingMeal, setLoadingMeal] = useState(false);
  const [loadingEx, setLoadingEx] = useState(false);
  const [error, setError] = useState("");

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
            <h1 className="text-2xl font-bold tracking-tight">
              AI Recommendations
            </h1>
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

      <Tabs defaultValue="meals">
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

        <TabsContent value="exercise" className="mt-4">
          <ExerciseTab
            exercise={exercise}
            loading={loadingEx}
            onRefresh={loadExercise}
          />
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
