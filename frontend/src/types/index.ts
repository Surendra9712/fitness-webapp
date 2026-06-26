export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export type Role = "admin" | "dietitian" | "trainee";
export type Goal = "lose_weight" | "maintain" | "gain_muscle";
export type ExerciseCategory =
  | "cardio"
  | "strength"
  | "flexibility"
  | "sports"
  | "other";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";
export type AssignmentStatus =
  | "pending_trainer"
  | "pending_admin"
  | "approved"
  | "rejected";

export interface TrainerInfo {
  id: number;
  name: string;
  email: string;
  customer_count?: number;
  avg_rating?: number;
  review_count?: number;
  profile_image_url: string;
  bio?: string;
  specialization?: string;
}

export interface TrainerAssignment {
  id: number;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  trainer_id: number;
  trainer_name?: string;
  trainer_email?: string;
  status: AssignmentStatus;
  customer_note?: string;
  trainer_note?: string;
  admin_note?: string;
  trainer_reviewed_at?: string;
  admin_reviewed_at?: string;
  reviewed_by_name?: string;
  created_at: string;
}
export type ProductStatus = "active" | "inactive";
export type RequestStatus = "pending" | "approved" | "rejected";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  status?: 'inactive' | 'active' | 'pending';
  created_at?: string;
  age?: number;
  weight_kg?: number;
  height_cm?: number;
  gender?: string;
  goal?: Goal;
  activity_level?: string;
}

export interface Exercise {
  id: number;
  name: string;
  category: ExerciseCategory;
  calories_burned_per_hour: number;
  description?: string;
}

export interface ExerciseLog {
  id: number;
  user_id: number;
  exercise_id: number;
  exercise_name: string;
  category: ExerciseCategory;
  logged_date: string;
  duration_minutes: number;
  calories_burned: number;
  notes?: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  category_id?: number;
  category: string; // slug from JOIN e.g. 'cardio'
  category_name?: string; // display name from JOIN e.g. 'Cardio'
  image_url?: string;
  status: ProductStatus;
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price_at_purchase: number;
}

export interface Order {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  status: OrderStatus;
  total_amount: number;
  shipping_address?: string;
  created_at: string;
  items?: OrderItem[];
}

export interface ProductRequest {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  product_name: string;
  description?: string;
  reason?: string;
  status: RequestStatus;
  admin_note?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by_name?: string;
}

export interface BodyMetrics {
  bmi: number;
  bmi_category: "Underweight" | "Normal" | "Overweight" | "Obese";
  bmr: number;
  tdee: number;
  daily_calories: number;
  macros: { protein: number; carbs: number; fat: number };
}

export interface DashboardStats {
  date: string;
  calories_out: number;
  exercise_mins_this_week: number;
  orders_count: number;
  pending_requests: number;
  metrics: BodyMetrics | null;
}

export interface Review {
  id: number;
  user_id: number;
  user_name: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface ReviewStats {
  avg_rating: number;
  count: number;
  reviews: Review[];
}

export interface AdminStats {
  users: number;
  dietitians: number;
  products: number;
  orders: number;
  pending_requests: number;
  recent_users: User[];
}
