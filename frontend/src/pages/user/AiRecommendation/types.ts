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

export interface MealRecommendation {
  meal_type: string;
  meal_class: string;
  recommendations: (FoodResult & { ai_score?: number })[];
  target?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  dry_fruits_addon?: {
    name: string;
    grams: number;
    calories_per_serving: number;
  }[];
}

export interface ExerciseItem {
  exercise_id: string;
  name: string;
  body_part: string;
  target_muscle: string;
  equipment: string;
  gif_url: string;
  has_animation: boolean;
  instructions: string[];
  difficulty: string;
  is_completed?: boolean;
}

export interface ExerciseRec {
  /** Effective day this plan belongs to (YYYY-MM-DD, server-decided). */
  date?: string;
  category: string;
  reason: string;
  scoring_method: string;
  exercises: ExerciseItem[];
  today_calories: number;
  target_calories: number;
  calorie_ratio: number;
  exercisedb_configured: boolean;
}

/** Progress against today's recommended exercises — gates "End Meal Today". */
export interface ExerciseStatus {
  date: string;
  plan_available: boolean;
  category?: string;
  total: number;
  completed: number;
  pending: string[];
  all_completed: boolean;
}

export interface NlpAnalysis {
  intent: string;
  foods_detected: string[];
  meal_type: string | null;
}

export type NlpResultData =
  | {
      type: "logged_meal_nutrition";
      items: FoodResult[];
      totals: Record<string, number>;
    }
  | { type: "recommendation"; meal_type: string; options: FoodResult[] }
  | { type: "not_found"; message: string }
  | { type: "unrecognized"; message: string };

export interface NlpResponse {
  nlp_analysis: NlpAnalysis;
  result: NlpResultData | null;
}
