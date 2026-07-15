import type { Gender, Role } from "@/types";

export const ROLE_LABELS: Record<Role, string> = {
  trainee: "Trainee",
  dietitian: "Trainer",
  admin: "Admin",
};

export const GENDER: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

export function getDashboardPath(role: Role): string {
  if (role === "admin") return "/dashboard";
  if (role === "dietitian") return "/trainer-dashboard";
  // if (role === "trainee") return "/my-dashboard";
  return "/my-dashboard";
}

export function getOrdersPath(role: Role): string {
  if (role === "dietitian") return "/trainer/my-orders";
  return "/trainee/my-orders";
}

export function getProfilePath(role: Role): string | null {
  if (role === "dietitian") return "/trainer/my-profile";
  if (role === "trainee") return "/trainee/my-profile";
  return null;
}

export function calcCalorieTarget(
  age?: number,
  weight_kg?: number,
  height_cm?: number,
  gender?: string,
  goal?: string,
  activity_level?: string,
): number | null {
  if (!age || !weight_kg || !height_cm) return null;

  let bmr: number;
  if (gender === "male") {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  } else if (gender === "female") {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  } else {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 78;
  }

  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const tdee = bmr * (multipliers[activity_level ?? "moderate"] ?? 1.55);

  if (goal === "lose_weight") return Math.round(tdee - 500);
  if (goal === "gain_muscle") return Math.round(tdee + 300);
  return Math.round(tdee);
}

export function toTitleCase(str: string) {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
