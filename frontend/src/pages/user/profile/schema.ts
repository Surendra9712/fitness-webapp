import { z } from "zod";

const positiveStr = (msg: string) =>
  z
    .string()
    .min(1, msg)
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
      "Must be a positive number",
    );

export const profileSchema = z.object({
  // Step 1
  full_name: z.string().min(1, "Name is required"),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  phone_number: z.string(),
  city: z.string(),
  country: z.string(),
  height_cm: positiveStr("Height is required"),
  current_weight_kg: positiveStr("Weight is required"),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  occupation: z.string(),
  // Step 2
  primary_goal: z.enum(["lose_weight", "gain_muscle", "maintain", "improve_health", "athletic_performance"]),
  fitness_level: z.enum(["beginner", "intermediate", "advanced"]),
  target_water_ml: z.number().min(500).max(6000),
  // Step 3
  diet_type: z.enum(["none", "vegetarian", "vegan", "keto", "paleo", "diabetic", "low_carb", "intermittent_fasting"]),
  dietary_restrictions: z.array(z.string()),
  other_restrictions: z.string(),
  allergens: z.array(z.string()),
  cuisine_preferences: z.array(z.string()),
  // Step 4
  breakfast_time: z.string(),
  lunch_time: z.string(),
  dinner_time: z.string(),
  avg_sleep_hours: z.string().refine(
    (v) => v === "" || (!isNaN(parseFloat(v)) && parseFloat(v) >= 3 && parseFloat(v) <= 12),
    "Must be 3–12",
  ),
  meals_per_day: z.number().int().min(1).max(8),
  snacks_between_meals: z.boolean(),
  cooking_frequency: z.enum(["daily", "few_times_week", "weekly", "rarely"]),
  eating_out_frequency: z.number().int().min(0).max(7),
  track_hydration: z.boolean(),
  emotional_eater: z.boolean(),
  stress_level: z.enum(["low", "moderate", "high", "very_high"]),
  // Step 5
  health_conditions: z.array(
    z.object({ name: z.string(), type: z.string(), affects_diet: z.boolean() }),
  ),
  notes: z.string(),
});

export type ProfileValues = z.infer<typeof profileSchema>;

export const STEP_REQUIRED: Record<number, (keyof ProfileValues)[]> = {
  1: ["full_name", "date_of_birth", "height_cm", "current_weight_kg"],
  2: [],
  3: [],
  4: [],
  5: [],
};
