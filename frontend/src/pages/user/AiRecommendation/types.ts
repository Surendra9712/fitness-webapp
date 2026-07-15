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
