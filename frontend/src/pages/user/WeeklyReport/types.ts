export interface DayData {
  date: string;
  day_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_count: number;
  calories_burned: number;
  exercise_minutes: number;
  workout_count: number;
  exercises_done: string;
  water_ml: number;
  water_pct: number;
}

export interface Summary {
  avg_calories: number;
  avg_protein_g: number;
  avg_carbs_g: number;
  avg_fat_g: number;
  target_calories: number;
  adherence_pct: number;
  days_logged: number;
  total_meals: number;
  total_calories_burned: number;
  total_exercise_mins: number;
  total_workouts: number;
  most_frequent_exercise: string | null;
  avg_water_ml: number;
  water_target_ml: number;
}

export interface WeeklyTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
}

export interface WeeklyData {
  week_start: string;
  week_end: string;
  daily_data: DayData[];
  summary: Summary;
  targets: WeeklyTargets;
  is_finalized?: boolean;
  finalized_at?: string;
}

export const DAY = (s: string) => s.slice(0, 3);
