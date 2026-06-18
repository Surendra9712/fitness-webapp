export type Role = 'admin' | 'dietitian' | 'user'
export type Goal = 'lose_weight' | 'maintain' | 'gain_muscle'
export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type ExerciseCategory = 'cardio' | 'strength' | 'flexibility' | 'sports' | 'other'
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  is_active?: boolean
  created_at?: string
  age?: number
  weight_kg?: number
  height_cm?: number
  gender?: string
  goal?: Goal
  activity_level?: string
}

export interface Meal {
  id: number
  name: string
  description?: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  category: MealCategory
  created_by?: number
  created_by_name?: string
  created_at?: string
}

export interface Exercise {
  id: number
  name: string
  category: ExerciseCategory
  calories_burned_per_hour: number
  description?: string
}

export interface DietPlanMeal {
  id: number
  plan_id: number
  meal_id: number
  meal_name: string
  day_of_week: DayOfWeek
  meal_time: MealCategory
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface DietPlan {
  id: number
  title: string
  description?: string
  goal: Goal
  total_daily_calories?: number
  dietitian_id?: number
  dietitian_name?: string
  created_at?: string
  meals?: DietPlanMeal[]
}

export interface Assignment {
  id: number
  user_id: number
  plan_id: number
  user_name: string
  user_email: string
  plan_title: string
  assigned_by_name?: string
  start_date: string
  end_date?: string
  is_active: boolean
  assignment_id?: number
}

export interface ActivePlan extends DietPlan {
  assignment_id: number
  start_date: string
  end_date?: string
  plan_id: number
}

export interface MealLog {
  id: number
  user_id: number
  meal_id: number
  meal_name: string
  logged_date: string
  meal_time: MealCategory
  notes?: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface ExerciseLog {
  id: number
  user_id: number
  exercise_id: number
  exercise_name: string
  category: ExerciseCategory
  logged_date: string
  duration_minutes: number
  calories_burned: number
  notes?: string
}

export interface DashboardStats {
  date: string
  calories_in: number
  calories_out: number
  net_calories: number
  meals_this_week: number
  exercise_mins_this_week: number
}

export interface AdminStats {
  users: number
  dietitians: number
  diet_plans: number
  meals: number
  recent_users: User[]
}
