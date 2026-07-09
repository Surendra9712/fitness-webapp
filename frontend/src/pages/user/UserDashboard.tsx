import { useEffect, useState, useRef } from "react";
import {
  Zap,
  Clock,
  ShoppingBag,
  Bell,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import ProfileSetup from "./profile/ProfileSetup";
import type { DashboardStats } from "@/types";

const today = new Date().toISOString().split("T")[0];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface MealLog {
  id: number;
  meal_type: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface Totals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}
interface Targets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface TodayMeals {
  date: string;
  meals: Record<string, MealLog[]>;
  totals: Totals;
  targets: Targets;
  total_entries: number;
}

interface FoodSearchResult {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  serving_size?: number;
  serving_unit?: string;
  source?: string;
}

// ── Meal types config ─────────────────────────────────────────────────────────
const MEAL_TYPES = [
  {
    key: "breakfast",
    label: "Breakfast",
    emoji: "🌅",
    class: "Light < 350 kcal",
  },
  { key: "lunch", label: "Lunch", emoji: "☀️", class: "Heavy 350–700 kcal" },
  { key: "snack", label: "Snack", emoji: "🍎", class: "Light < 220 kcal" },
  { key: "dinner", label: "Dinner", emoji: "🌙", class: "Heavy 280–600 kcal" },
] as const;

const UNITS = [
  "serving",
  "g",
  "pieces",
  "cup",
  "bowl",
  "plate",
  "glass",
  "tbsp",
  "ml",
];

// ── NutritionRing ─────────────────────────────────────────────────────────────
function NutritionRing({
  label,
  value,
  target,
  unit,
  ringColor,
  dotColor,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  ringColor: string;
  dotColor: string;
}) {
  const pct = Math.min(
    100,
    target > 0 ? Math.round((value / target) * 100) : 0,
  );
  const r = 32;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;

  return (
    <div className="rounded-2xl bg-[#0c1310] border border-white/5 px-5 py-5 flex items-center gap-4 overflow-hidden">
      <div className="flex flex-col items-center gap-2 shrink-0">
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
        <div className="relative h-[76px] w-[76px]">
          <svg viewBox="0 0 76 76" className="h-[76px] w-[76px] -rotate-90">
            <circle
              cx={38}
              cy={38}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={7}
            />
            <circle
              cx={38}
              cy={38}
              r={r}
              fill="none"
              stroke={ringColor}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              className="transition-all"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white">{pct}%</span>
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white/50 truncate">{label}</p>
        <p className="text-2xl font-bold text-white leading-tight truncate">
          {Math.round(value)}
        </p>
        <p className="text-xs text-white/40 truncate">
          /{Math.round(target)}
          {unit}
        </p>
      </div>
    </div>
  );
}

// ── MealSection ───────────────────────────────────────────────────────────────
function MealSection({
  mealType,
  emoji,
  label,
  classLabel,
  logs,
  onLog,
  onDelete,
}: {
  mealType: string;
  emoji: string;
  label: string;
  classLabel: string;
  logs: MealLog[];
  onLog: (
    meal: string,
    food: FoodSearchResult,
    qty: number,
    unit: string,
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(mealType === "breakfast");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("serving");
  const [logging, setLogging] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mealCalories = logs.reduce((s, l) => s + (Number(l.calories) || 0), 0);

  const handleSearch = (q: string) => {
    setQuery(q);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get<{ results: FoodSearchResult[] }>(
          `/ai/food/search?q=${encodeURIComponent(q)}`,
        );
        setResults(res.results);
      } catch {
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const selectFood = (f: FoodSearchResult) => {
    setSelected(f);
    setQuery(f.name);
    setResults([]);
    setUnit(f.serving_unit || "serving");
    setQty("1");
  };

  const handleLog = async () => {
    if (!selected) return;
    const q = parseFloat(qty) || 1;
    setLogging(true);
    try {
      await onLog(mealType, selected, q, unit);
      setSelected(null);
      setQuery("");
      setQty("1");
    } catch {
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{emoji}</span>
          <div className="text-left">
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-muted-foreground">{classLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            {Math.round(mealCalories)} kcal · {logs.length} items
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t bg-card/50">
          {/* Logged items */}
          {logs.length > 0 && (
            <div className="space-y-1 pt-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {log.food_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.quantity} {log.unit} ·{" "}
                      {Math.round(Number(log.calories))} kcal · P
                      {Math.round(Number(log.protein_g))}g · C
                      {Math.round(Number(log.carbs_g))}g · F
                      {Math.round(Number(log.fat_g))}g
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(log.id)}
                    className="ml-2 shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="space-y-2 pt-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8 text-sm h-8"
                placeholder="Search food (Nepali, global, any language)..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {searching && (
              <p className="text-xs text-muted-foreground pl-1">
                Searching USDA, Nutritionix...
              </p>
            )}

            {results.length > 0 && !selected && (
              <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {results.map((f, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b last:border-b-0"
                    onClick={() => selectFood(f)}
                  >
                    <p className="text-sm font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.calories} kcal · P{f.protein_g}g · C{f.carbs_g}g · F
                      {f.fat_g}g
                      {f.serving_size &&
                        ` · per ${f.serving_size}${f.serving_unit || "g"}`}
                      {f.source && (
                        <span className="ml-1 opacity-60 capitalize">
                          ({f.source})
                        </span>
                      )}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                <p className="text-sm font-semibold text-primary">
                  ✓ {selected.name}
                </p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Quantity
                    </label>
                    <Input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Unit
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full h-8 text-sm border rounded-md px-2 bg-background"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Estimated nutrition preview */}
                <div className="flex flex-wrap gap-1 text-xs">
                  {[
                    [
                      "🔥",
                      Math.round(selected.calories * parseFloat(qty || "1")),
                      "kcal",
                    ],
                    [
                      "💪",
                      (selected.protein_g * parseFloat(qty || "1")).toFixed(1),
                      "g protein",
                    ],
                    [
                      "🌾",
                      (selected.carbs_g * parseFloat(qty || "1")).toFixed(1),
                      "g carbs",
                    ],
                    [
                      "🥑",
                      (selected.fat_g * parseFloat(qty || "1")).toFixed(1),
                      "g fat",
                    ],
                  ].map(([icon, val, label]) => (
                    <span
                      key={label as string}
                      className="bg-muted px-2 py-0.5 rounded-full"
                    >
                      {icon} {val} {label}
                    </span>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="w-full h-8"
                  onClick={handleLog}
                  disabled={logging}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {logging ? "Adding..." : `Add to ${label}`}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main UserDashboard ────────────────────────────────────────────────────────
export default function UserDashboard() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayMeals, setTodayMeals] = useState<TodayMeals | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasProfile = Boolean((user as any)?.full_name);

  const loadData = async () => {
    try {
      const [s, m] = await Promise.all([
        api.get<DashboardStats>(`/user/dashboard?date=${today}`),
        api.get<TodayMeals>(`/ai/meals/today?date=${today}`),
      ]);
      setStats(s);
      setTodayMeals(m);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    if (!hasProfile) return;
    loadData();
  }, [hasProfile]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogMeal = async (
    mealType: string,
    food: FoodSearchResult,
    qty: number,
    unit: string,
  ) => {
    await api.post("/ai/meals/log", {
      meal_type: mealType,
      food_name: food.name,
      quantity: qty,
      unit,
      food_source: food.source || "manual",
      calories: food.calories * qty,
      protein_g: food.protein_g * qty,
      carbs_g: food.carbs_g * qty,
      fat_g: food.fat_g * qty,
      fiber_g: (food.fiber_g || 0) * qty,
      sugar_g: (food.sugar_g || 0) * qty,
      sodium_mg: (food.sodium_mg || 0) * qty,
      portion_g: food.serving_size ? food.serving_size * qty : null,
    });
    await loadData();
  };

  const handleDeleteLog = async (id: number) => {
    await api.delete(`/ai/meals/log/${id}`);
    await loadData();
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <ProfileSetup
        inline
        onDone={() => {
          refreshUser();
        }}
      />
    );
  }

  const totals = todayMeals?.totals;
  const targets = todayMeals?.targets;

  return (
    <div className="space-y-6 pt-1">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight leading-snug">
            {getGreeting()}, {user?.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-sm text-foreground/60 mt-1.5 leading-relaxed">
            Log your meals through the day — breakfast, lunch, snacks, then
            dinner
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Today's nutrition progress */}
      {totals && targets && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NutritionRing
            label="Calories"
            value={totals.calories}
            target={targets.calories}
            unit="kcal"
            ringColor="#2dd4bf"
            dotColor="bg-teal-400"
          />
          <NutritionRing
            label="Protein"
            value={totals.protein_g}
            target={targets.protein_g}
            unit="g"
            ringColor="#a3e635"
            dotColor="bg-lime-400"
          />
          <NutritionRing
            label="Carbs"
            value={totals.carbs_g}
            target={targets.carbs_g}
            unit="g"
            ringColor="#22d3ee"
            dotColor="bg-cyan-400"
          />
          <NutritionRing
            label="Fat"
            value={totals.fat_g}
            target={targets.fat_g}
            unit="g"
            ringColor="#60a5fa"
            dotColor="bg-blue-400"
          />
        </div>
      )}

      {/* Meal sections: breakfast → lunch → snack → dinner */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Today's Meals</h2>
        <div className="space-y-2">
          {MEAL_TYPES.map((mt) => (
            <MealSection
              key={mt.key}
              mealType={mt.key}
              emoji={mt.emoji}
              label={mt.label}
              classLabel={mt.class}
              logs={todayMeals?.meals[mt.key] ?? []}
              onLog={handleLogMeal}
              onDelete={handleDeleteLog}
            />
          ))}
        </div>
      </div>

      {/* BMI/Metrics card */}
      {stats?.metrics && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Body Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                {
                  label: "BMI",
                  value: stats.metrics.bmi,
                  sub: stats.metrics.bmi_category,
                },
                {
                  label: "BMR",
                  value: stats.metrics.bmr,
                  sub: "kcal/day at rest",
                },
                {
                  label: "TDEE",
                  value: stats.metrics.tdee,
                  sub: "kcal/day total",
                },
                {
                  label: "Daily Target",
                  value: stats.metrics.daily_calories,
                  sub: "kcal goal",
                },
              ].map((m) => (
                <div key={m.label} className="space-y-1">
                  <p className="text-2xl font-bold text-primary">{m.value}</p>
                  <p className="text-xs font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.sub}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
