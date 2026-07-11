export interface FoodResult {
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

export interface MealTarget {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealRecommendation {
  meal_type: string;
  meal_class: string;
  target?: MealTarget;
  scoring_method?: string;
  fallback_used?: boolean;
  recommendations: (FoodResult & { ai_score?: number })[];
  dry_fruits_addon?: {
    name: string;
    grams: number;
    calories_per_serving: number;
  }[];
}

export interface NutritionTargets {
  bmi: number;
  bmr: number;
  tdee: number;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
}

export interface WeeklyMealSlot {
  chosen: (FoodResult & { ai_score?: number }) | null;
  alternatives: (FoodResult & { ai_score?: number })[];
  dry_fruits_addon?: {
    name: string;
    grams: number;
    calories_per_serving: number;
  }[];
}

export type WeeklyDayPlan = Record<string, WeeklyMealSlot>;

export interface WeeklyPlanResponse {
  nutrition_targets: NutritionTargets;
  weekly_plan: Record<string, WeeklyDayPlan>;
}

export interface ExerciseItem {
  name: string;
  body_part: string;
  target_muscle: string;
  equipment: string;
  gif_url: string;
  has_animation: boolean;
  instructions: string[];
  difficulty: string;
}

export interface ExerciseRec {
  category: string;
  reason: string;
  scoring_method: string;
  exercises: ExerciseItem[];
  today_calories: number;
  target_calories: number;
  calorie_ratio: number;
  exercisedb_configured: boolean;
}

export interface NlpAnalysis {
  intent?: string;
  foods_detected?: string[];
}

export interface NlpLoggedMealResult {
  type: "logged_meal_nutrition";
  items: FoodResult[];
  totals: Record<string, number>;
  fallback_source?: string;
}

export interface NlpRecommendationResult {
  type: "recommendation";
  meal_type?: string;
  options: FoodResult[];
}

export interface NlpNutritionInfoResult {
  type: "nutrition_info";
  foods: FoodResult[];
}

export interface NlpNotFoundResult {
  type: "not_found" | "unrecognized";
  message: string;
}

export type NlpResultData =
  | NlpLoggedMealResult
  | NlpRecommendationResult
  | NlpNutritionInfoResult
  | NlpNotFoundResult;

export interface NlpQueryResponse {
  nlp_analysis: NlpAnalysis;
  result: NlpResultData;
}
