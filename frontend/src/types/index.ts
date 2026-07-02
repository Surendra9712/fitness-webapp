export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export type Role = "admin" | "dietitian" | "trainee";
export type Gender = "male" | "female" | "other";
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

export interface TrainerCertification {
  id: number;
  user_id?: number;
  name: string;
  issued_by?: string;
  issued_date?: string;
  file_url?: string;
  file_type: "image" | "pdf" | "url";
  created_at?: string;
}

export interface AvailableSlot {
  day: string;
  from: string;
  to: string;
}

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
  experience_years?: number;
  date_of_birth?: string;
  available_time?: AvailableSlot[];
  certifications?: TrainerCertification[];
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

export type SubscriptionPlan = "free" | "pro";
export type SubscriptionStatus = "active" | "pending" | "rejected";
export type SubscriptionPaymentMethod = "cash" | "esewa";

export interface EsewaParams {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  is_verified?: number;
  subscription_plan?: SubscriptionPlan;
  subscription_status?: SubscriptionStatus;
  subscription_payment_method?: SubscriptionPaymentMethod;
  reward_points?: number;
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

export type DiscountType = "percentage" | "fixed";

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  category_id: number;
  category: string; // slug from JOIN e.g. 'cardio'
  category_name?: string; // display name from JOIN e.g. 'Cardio'
  image_url?: string;
  status: ProductStatus;
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
  discount_type?: DiscountType | null;
  discount_value?: number | null;
  discount_valid_from?: string | null;
  discount_valid_to?: string | null;
  discounted_price?: number | null;
}

export interface GlobalDiscount {
  discount_type: DiscountType;
  discount_value: number;
  is_active: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
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
  image_url?: string;
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

// ─── Status / shared ────────────────────────────────────────────────
export type UserStatus = "inactive" | "active" | "pending";

// ─── Admin stats ────────────────────────────────────────────────────
export interface AdminStats {
  users: number;
  dietitians: number;
  products: number;
  orders: number;
  pending_requests: number;
  pending_approvals: number;
  pending_assignments: number;
  total_revenue: number;
  revenue_30d: number;
  orders_by_status: Record<string, number>;
  users_by_status: { status: string; count: number }[];
}

export interface AdminStatsTrends {
  user_growth: { date: string; users: number }[];
  order_trend: { date: string; orders: number; revenue: number }[];
  group_by: "day" | "month";
  date_from: string;
  date_to: string;
}

// ─── Dietitian ───────────────────────────────────────────────────────
export interface DietitianProfile {
  id: number;
  name: string;
  full_name?: string;
  email: string;
  bio?: string;
  specialization?: string;
  experience_years?: number;
  date_of_birth?: string;
  phone_number?: string;
  city?: string;
  country?: string;
  status?: string;
  profile_image_url?: string;
  available_time?: AvailableSlot[];
  certifications?: TrainerCertification[];
}

export interface DietitianStats {
  client_count: number;
  pending_assignments: number;
}

// ─── Mutation payloads ───────────────────────────────────────────────
export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserPayload {
  id: number;
  name?: string;
  email?: string;
  role?: Role;
  status?: UserStatus;
}

export interface UpdateOrderStatusPayload {
  orderId: number;
  status: OrderStatus;
}

export interface AssignmentActionPayload {
  id: number;
  admin_note?: string;
}

export interface TrainerAssignmentActionPayload {
  id: number;
  trainer_note?: string;
}

export interface ApproveProductRequestPayload {
  id: number;
  price: number;
  stock_quantity: number;
  category: string;
  admin_note?: string;
}

export interface CreateOrderPayload {
  items: { product_id: number; quantity: number }[];
  shipping_address: string;
  payment_method: string;
  promo_code?: string;
  points_to_redeem?: number;
}

export interface PromoCode {
  id: number;
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_uses?: number;
  current_uses: number;
  valid_from?: string;
  valid_to?: string;
  is_active: boolean;
  created_at?: string;
}

export interface PromoValidateResult {
  promo_id: number;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discount_amount: number;
  min_order_amount: number;
}

export interface PointTransaction {
  id: number;
  points: number;
  type: "earned" | "redeemed";
  reference_id?: number;
  description?: string;
  created_at: string;
}

export interface PointsData {
  reward_points: number;
  transactions: PointTransaction[];
  total: number;
}

export interface CreateProductRequestPayload {
  product_name: string;
  description?: string;
  reason?: string;
  image_url?: string;
}

export interface LogExercisePayload {
  exercise_id: number;
  logged_date: string;
  duration_minutes: number;
  notes?: string;
}

export interface ReviewPayload {
  rating: number;
  comment?: string | null;
}

export interface RequestTrainerPayload {
  trainer_id: number;
  customer_note?: string;
}

export type NotificationType =
  | 'order_received'
  | 'order_status'
  | 'subscription_request'
  | 'subscription_approved'
  | 'subscription_rejected'
  | 'product_request'
  | 'product_request_approved'
  | 'product_request_rejected'
  | 'trainer_request'
  | 'trainer_request_to_admin'
  | 'trainer_signup_request'
  | 'trainer_accepted'
  | 'trainer_approved'
  | 'trainer_rejected';

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message?: string;
  reference_id?: number;
  is_read: boolean | number;
  created_at: string;
}

export interface BecomeTrainerPayload {
  full_name?: string;
  date_of_birth?: string;
  bio?: string;
  specialization?: string;
  experience_years?: number;
  phone_number?: string;
  city?: string;
  country?: string;
  profile_image_url?: string;
  available_time: AvailableSlot[];
  certifications: {
    name: string;
    file_url?: string;
    file_type: "image" | "pdf" | "url";
  }[];
}

export interface PublicBecomeTrainerPayload {
  name: string;
  email: string;
  password: string;
  date_of_birth: string;
  specialization: string;
  experience_years: number;
  bio?: string;
  phone_number?: string;
  city?: string;
  country?: string;
  profile_image_url?: string;
  available_time: AvailableSlot[];
  certifications: {
    name: string;
    file_url?: string;
    file_type: "image" | "pdf" | "url";
  }[];
}

export interface BecomeTrainerResult {
  token: string;
  user: { id: number; name: string; email: string; role: "dietitian" };
}

export interface UpdateProfilePayload {
  id?: number;
  name?: string;
  email?: string;
  bio?: string;
  specialization?: string;
  age?: number;
  weight_kg?: number;
  height_cm?: number;
  gender?: string;
  goal?: Goal;
  activity_level?: string;
  profile_image_url?: string;
}
