export const STEPS = ["Personal Info", "Your Goal", "Diet & Allergens", "Habits", "Health"];

export const GOALS = [
  { key: "lose_weight",          icon: "📉", title: "Lose Weight",    desc: "Caloric deficit + cardio" },
  { key: "gain_muscle",          icon: "💪", title: "Gain Muscle",    desc: "Protein surplus + strength" },
  { key: "maintain",             icon: "⚖️", title: "Maintain",       desc: "Balanced macros" },
  { key: "improve_health",       icon: "❤️", title: "Improve Health", desc: "Overall wellness" },
  { key: "athletic_performance", icon: "🏃", title: "Athletic",       desc: "Endurance + energy" },
];

export const DIETS: [string, string][] = [
  ["none",                 "No Restriction"],
  ["vegetarian",           "Vegetarian"],
  ["vegan",                "Vegan"],
  ["keto",                 "Keto"],
  ["paleo",                "Paleo"],
  ["diabetic",             "Diabetic"],
  ["low_carb",             "Low Carb"],
  ["intermittent_fasting", "Intermittent Fasting"],
];

export const DIETARY_FLAGS: [string, string][] = [
  ["gluten_free",       "Gluten Free"],
  ["dairy_free",        "Dairy Free"],
  ["halal",             "Halal"],
  ["diabetic_friendly", "Diabetic Friendly"],
];

export const ALLERGENS = ["Peanuts", "Dairy", "Eggs", "Wheat", "Soy", "Tree Nuts", "Shellfish", "Sesame", "Fish"];

export const CUISINES = ["Nepali", "Indian", "Chinese", "Continental", "Italian", "Japanese", "Mexican", "Mediterranean"];

export const CONDITIONS = [
  { key: "diabetes",          name: "Diabetes" },
  { key: "hypertension",      name: "Hypertension" },
  { key: "heart_disease",     name: "Heart Disease" },
  { key: "kidney_disease",    name: "Kidney Disease" },
  { key: "food_intolerance",  name: "Food Intolerance" },
  { key: "metabolic_disorder",name: "Metabolic Disorder" },
];

export const ACTIVITIES: [string, string][] = [
  ["sedentary",  "Sedentary"],
  ["light",      "Light"],
  ["moderate",   "Moderate"],
  ["active",     "Active"],
  ["very_active","Very Active"],
];

export const FITNESS: [string, string][] = [
  ["beginner",     "Beginner"],
  ["intermediate", "Intermediate"],
  ["advanced",     "Advanced"],
];

export const COOKING: [string, string][] = [
  ["daily",           "Daily"],
  ["few_times_week",  "Few times/week"],
  ["weekly",          "Weekly"],
  ["rarely",          "Rarely"],
];

export const STRESS: [string, string][] = [
  ["low",       "Low"],
  ["moderate",  "Moderate"],
  ["high",      "High"],
  ["very_high", "Very High"],
];
