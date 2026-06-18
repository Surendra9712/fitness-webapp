import type { Role } from '@/types'

export const ROLE_LABELS: Record<Role, string> = {
  user: 'Customer',
  dietitian: 'Trainer',
  admin: 'Admin',
}

export function getDashboardPath(role: Role): string {
  if (role === 'admin') return '/admin'
  if (role === 'dietitian') return '/trainer'
  return '/customer'
}

export function calcCalorieTarget(
  age?: number,
  weight_kg?: number,
  height_cm?: number,
  gender?: string,
  goal?: string,
  activity_level?: string,
): number | null {
  if (!age || !weight_kg || !height_cm) return null

  let bmr: number
  if (gender === 'male') {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
  } else if (gender === 'female') {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
  } else {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 78
  }

  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }
  const tdee = bmr * (multipliers[activity_level ?? 'moderate'] ?? 1.55)

  if (goal === 'lose_weight') return Math.round(tdee - 500)
  if (goal === 'gain_muscle') return Math.round(tdee + 300)
  return Math.round(tdee)
}
