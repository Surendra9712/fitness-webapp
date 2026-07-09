export type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type WeightRecommendation = {
  bmi: number;
  current_weight_kg: number;
  target_weight_kg: number;
  healthy_min_kg: number;
  healthy_max_kg: number;
  weeks_to_target: number;
};

export const togArr = (arr: string[], val: string) =>
  arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

export function parseJsonField<T>(val: unknown, fallback: T): T {
  if (Array.isArray(val)) return val as T;
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}
