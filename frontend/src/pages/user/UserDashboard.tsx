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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import ProfileSetup from "./profile/ProfileSetup";
import type { DashboardStats } from "@/types";

const today = new Date().toISOString().split("T")[0];

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

// ── NutritionBar ──────────────────────────────────────────────────────────────
function NutritionBar({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const pct = Math.min(
    100,
    target > 0 ? Math.round((value / target) * 100) : 0,
  );
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="font-medium">{label}</span>
        <span>
          {Math.round(value)} / {Math.round(target)}
        </span>
      </div>
      <div className="w-full bg-secondary rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
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

      {/* Stats cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "My Orders",
              value: stats.orders_count,
              icon: <ShoppingBag className="h-4 w-4 text-blue-500" />,
              sub: "total orders",
            },
            {
              label: "Pending Requests",
              value: stats.pending_requests,
              icon: <Bell className="h-4 w-4 text-orange-500" />,
              sub: "awaiting review",
            },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                {s.icon}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{s.value}</div>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Today's nutrition progress */}
      {totals && targets && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Today's Nutrition</span>
              <Badge variant="secondary" className="font-normal">
                {totals.calories > 0
                  ? `${Math.round((totals.calories / targets.calories) * 100)}% of daily goal`
                  : "Not started"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NutritionBar
              label="Calories"
              value={totals.calories}
              target={targets.calories}
              color="bg-orange-400"
            />
            <NutritionBar
              label="Protein"
              value={totals.protein_g}
              target={targets.protein_g}
              color="bg-blue-400"
            />
            <NutritionBar
              label="Carbs"
              value={totals.carbs_g}
              target={targets.carbs_g}
              color="bg-green-400"
            />
            <NutritionBar
              label="Fat"
              value={totals.fat_g}
              target={targets.fat_g}
              color="bg-yellow-400"
            />
          </CardContent>
        </Card>
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
