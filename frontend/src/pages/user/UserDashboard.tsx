import { useEffect, useState, useRef, useCallback } from "react";
import {
  Zap,
  Clock,
  ShoppingBag,
  Bell,
  Plus,
  Minus,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Dumbbell,
  Droplets,
  Droplet,
  CheckCircle2,
  XCircle,
  Sunrise,
  Sun,
  Apple,
  Moon,
  Flame,
  Wheat,
  Lightbulb,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import ProfileSetup from "./profile/ProfileSetup";
import type { DashboardStats } from "@/types";
import { Progress } from "@/components/ui/progress";
import { SearchInput } from "@/components/ui/search-input";

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
  is_consumed: number;
  ai_explanation?: string;
  cuisine?: string;
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
interface Water {
  consumed_ml: number;
  target_ml: number;
  pct: number;
}
interface TodayMeals {
  date: string;
  meals: Record<string, MealLog[]>;
  totals: Totals;
  targets: Targets;
  total_entries: number;
  water: Water;
  day_ended: boolean;
}
interface FoodResult {
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
  cuisine?: string;
  ai_explanation?: string;
}

const MEAL_TYPES = [
  {
    key: "breakfast",
    label: "Breakfast",
    icon: Sunrise,
    class: "Light < 350 kcal",
  },
  {
    key: "lunch",
    label: "Lunch",
    icon: Sun,
    class: "Heavy 350–700 kcal",
  },
  {
    key: "snack",
    label: "Snack",
    icon: Apple,
    class: "Light < 220 kcal",
  },
  {
    key: "dinner",
    label: "Dinner",
    icon: Moon,
    class: "Heavy 280–600 kcal",
  },
] as const;

const WATER_AMOUNTS = [150, 200, 250, 300, 500];

// serving_unit is a self-describing portion string, e.g. "1 plate (250 g)",
// "2 slices (70 g)", or "200 ml". Show it as-is; fall back to grams.
function formatServing(food: FoodResult): string | null {
  if (food.serving_unit) return food.serving_unit;
  if (food.serving_size) return `${food.serving_size} g`;
  return null;
}

// Whether the serving weight is measured in ml (drinks) or g (everything else),
// inferred from the unit string ("… ml" / "… ml)").
function servingMeasure(food: FoodResult): "g" | "ml" {
  return /ml\)?\s*$/i.test(food.serving_unit ?? "") ? "ml" : "g";
}

// Total amount for the chosen number of servings, so the user can gauge how
// much they're actually logging (e.g. "≈ 500 g" for 2 × 250 g).
function totalQuantity(food: FoodResult, qty: number): string | null {
  if (!food.serving_size || !Number.isFinite(qty) || qty <= 0) return null;
  const total = Math.round(food.serving_size * qty);
  return `≈ ${total} ${servingMeasure(food)}`;
}

// DEV/TESTING ONLY — keeps "End Meal Today" clickable even after the day has
// already been ended, so the flow can be exercised repeatedly without
// waiting for a real day to pass. The backend advances one simulated day
// per click when this is on. Controlled by VITE_MODE (must match backend
// MODE) rather than a hardcoded flag, so it's off by default in production.
const DEV_ALWAYS_ALLOW_END_DAY = import.meta.env.VITE_MODE === "dev";

function MacroRing({
  label,
  value,
  target,
  unit,
  stroke,
  icon: Icon,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  stroke: string;
  icon: LucideIcon;
}) {
  const pct =
    target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="bg-card border rounded-xl p-4 flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="8"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <Icon className="h-4 w-4" style={{ color: stroke }} />
          <span className="text-xs font-bold">{pct}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold">
          {Math.round(value)}
          <span className="text-xs font-normal text-muted-foreground">
            /{Math.round(target)}
            {unit}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function MealSection({
  mealType,
  icon: Icon,
  label,
  classLabel,
  logs,
  onLog,
  onDelete,
  onToggleConsumed,
  disabled,
}: {
  mealType: string;
  icon: LucideIcon;
  label: string;
  classLabel: string;
  logs: MealLog[];
  onLog: (
    meal: string,
    food: FoodResult,
    qty: number,
    unit: string,
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onToggleConsumed: (id: number, val: number) => Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(mealType === "breakfast");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [qty, setQty] = useState("1");
  const [logging, setLogging] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mealCal = logs
    .filter((l) => l.is_consumed)
    .reduce((s, l) => s + Number(l.calories), 0);

  const handleSearch = async (q: string) => {
    setQuery(q);
    setSelected(null);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const r = await api.get<{ results: FoodResult[] }>(
        `/ai/food/search?q=${encodeURIComponent(q)}`,
      );
      setResults(r.results);
    } catch {
    } finally {
      setSearching(false);
    }
  };

  const selectFood = (f: FoodResult) => {
    setSelected(f);
    setQuery(f.name);
    setResults([]);
    setQty("1");
  };

  const adjustQty = (delta: number) => {
    setQty((prev) => Math.max(0.5, (parseFloat(prev) || 1) + delta).toString());
  };

  const handleLog = async () => {
    if (!selected) return;
    const q = parseFloat(qty) || 1;
    setLogging(true);
    try {
      await onLog(mealType, selected, q, selected.serving_unit || "serving");
      setSelected(null);
      setQuery("");
      setQty("1");
    } catch {
    } finally {
      setLogging(false);
    }
  };

  const handleAiSuggest = async () => {
    try {
      const r = await api.get<{
        recommendation: {
          recommendations: {
            name: string;
            calories: number;
            protein_g: number;
            carbs_g: number;
            fat_g: number;
            ai_explanation?: string;
            cuisine?: string;
          }[];
        };
      }>(`/ai/recommend/meal?meal_type=${mealType}`);
      const food = r?.recommendation?.recommendations?.[0];
      if (food) {
        setQuery(food.name);
        selectFood({
          name: food.name,
          calories: food.calories,
          protein_g: food.protein_g,
          carbs_g: food.carbs_g,
          fat_g: food.fat_g,
          source: "ai",
          ai_explanation: food.ai_explanation,
          cuisine: food.cuisine,
        });
      }
    } catch {}
  };

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div className="text-left">
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-muted-foreground">{classLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {Math.round(mealCal)} kcal · {logs.length} items
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
          {logs.length > 0 && (
            <div className="space-y-1 pt-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-all ${log.is_consumed ? "bg-muted/40" : "bg-muted/10 opacity-60"}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {log.food_name}
                      </p>
                      {log.cuisine && (
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize px-1"
                        >
                          {log.cuisine}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {log.quantity}{" "}
                      {log.quantity === 1 ? "serving" : "servings"}
                      {log.unit && log.unit !== "serving"
                        ? ` · ${log.unit}`
                        : ""}{" "}
                      · {Math.round(Number(log.calories))} kcal · P
                      {Math.round(Number(log.protein_g))}g
                    </p>
                    {log.ai_explanation && (
                      <p className="text-[10px] text-blue-500 mt-0.5 line-clamp-1 flex items-center gap-1">
                        <Lightbulb className="h-2.5 w-2.5 shrink-0" />
                        {log.ai_explanation}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {/* <button
                      onClick={() =>
                        onToggleConsumed(log.id, log.is_consumed ? 0 : 1)
                      }
                      className={`p-1 rounded transition-colors ${log.is_consumed ? "text-emerald-500 hover:text-emerald-700" : "text-muted-foreground hover:text-emerald-500"}`}
                      title={
                        log.is_consumed ? "Mark as skipped" : "Mark as eaten"
                      }
                    >
                      {log.is_consumed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </button> */}
                    <Button
                      size={"icon"}
                      variant={"danger-subtle"}
                      onClick={() => onDelete(log.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {disabled ? (
            <p className="text-xs text-muted-foreground italic pt-1">
              Today's log is finalized — start logging again after your next day
              begins.
            </p>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="relative">
                <SearchInput onSearch={handleSearch} />
              </div>
              {searching && (
                <p className="text-xs text-muted-foreground pl-1">
                  Searching...
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
                      <p className="text-sm font-medium">
                        {f.name}{" "}
                        {f.cuisine && (
                          <span className="text-[10px] text-muted-foreground capitalize">
                            ({f.cuisine})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {f.calories} kcal · P{f.protein_g}g · C{f.carbs_g}g · F
                        {f.fat_g}g
                      </p>
                      {formatServing(f) && (
                        <p className="text-[10px] text-muted-foreground">
                          per serving: {formatServing(f)}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {/* {!selected && results.length === 0 && (
                <button
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 text-sm text-primary hover:bg-primary/10 transition-colors"
                  onClick={handleAiSuggest}
                >
                  AI: what should I eat for {label.toLowerCase()}?
                </button>
              )} */}
              {selected && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {selected.name}
                  </p>
                  {selected.ai_explanation && (
                    <p className="text-[10px] text-blue-600 flex items-center gap-1">
                      <Lightbulb className="h-2.5 w-2.5 shrink-0" />
                      {selected.ai_explanation}
                    </p>
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Servings
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustQty(-0.5)}
                        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border hover:bg-muted transition-colors"
                        aria-label="Decrease servings"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <Input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        className="h-8 text-sm text-center w-16 shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => adjustQty(0.5)}
                        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border hover:bg-muted transition-colors"
                        aria-label="Increase servings"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      {formatServing(selected) && (
                        <span className="text-xs text-muted-foreground truncate">
                          1 serving = {formatServing(selected)}
                        </span>
                      )}
                    </div>
                    {totalQuantity(selected, parseFloat(qty || "1")) && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {qty || "1"}{" "}
                        {parseFloat(qty || "1") === 1 ? "serving" : "servings"}{" "}
                        {totalQuantity(selected, parseFloat(qty || "1"))}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 text-xs">
                    {[
                      {
                        Icon: Flame,
                        value: Math.round(
                          selected.calories * parseFloat(qty || "1"),
                        ),
                        label: "kcal",
                      },
                      {
                        Icon: Dumbbell,
                        value: (
                          selected.protein_g * parseFloat(qty || "1")
                        ).toFixed(1),
                        label: "g protein",
                      },
                      {
                        Icon: Wheat,
                        value: (
                          selected.carbs_g * parseFloat(qty || "1")
                        ).toFixed(1),
                        label: "g carbs",
                      },
                    ].map(({ Icon, value, label: badgeLabel }) => (
                      <span
                        key={badgeLabel}
                        className="bg-muted px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                      >
                        <Icon className="h-3 w-3" />
                        {value} {badgeLabel}
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
          )}
        </div>
      )}
    </div>
  );
}

export default function UserDashboard() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayMeals, setTodayMeals] = useState<TodayMeals | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [endingDay, setEndingDay] = useState(false);
  const [dayEnded, setDayEnded] = useState(false);
  const [lastEndedDate, setLastEndedDate] = useState<string | null>(null);
  const [tomorrowPlan, setTomorrowPlan] = useState<Record<
    string,
    unknown
  > | null>(null);
  const hasProfile = Boolean(user?.full_name);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    setError("");
    try {
      // Computed fresh (not a frozen constant) so a session left open across
      // midnight picks up the new calendar day on the next refresh instead
      // of staying stuck on yesterday's date.
      const dateStr = new Date().toISOString().split("T")[0];
      const [s, m] = await Promise.all([
        api.get<DashboardStats>(`/user/dashboard?date=${dateStr}`),
        api.get<TodayMeals>(`/ai/meals/today?date=${dateStr}`),
      ]);
      setStats(s);
      setTodayMeals(m);
      setDayEnded(m.day_ended);
      if (m.day_ended) {
        // Day was already ended in a previous session (e.g. page reload) —
        // re-fetch a plan preview since it isn't persisted server-side.
        try {
          const plan =
            await api.get<Record<string, unknown>>("/ai/recommend/meal");
          setTomorrowPlan(plan);
        } catch {
          // Non-critical — the "day ended" panel still renders without it.
        }
      } else {
        setTomorrowPlan(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasProfile) return;
    loadData();
  }, [hasProfile, loadData]);

  // Req 12: Refresh stats when returning from exercise page
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const signal = localStorage.getItem("smartdiet_exercise_completed");
        if (signal) {
          localStorage.removeItem("smartdiet_exercise_completed");
          loadData(); // Refresh calories_burned + exercise_mins_this_week
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    // Also check on mount (user navigated back)
    const signal = localStorage.getItem("smartdiet_exercise_completed");
    if (signal) {
      localStorage.removeItem("smartdiet_exercise_completed");
      loadData();
    }
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogMeal = async (
    mealType: string,
    food: FoodResult,
    qty: number,
    unit: string,
  ) => {
    await api.post("/ai/meals/log", {
      meal_type: mealType,
      food_name: food.name,
      quantity: qty,
      unit,
      food_source: food.source || "manual",
      is_consumed: 1,
      calories: food.calories * qty,
      protein_g: food.protein_g * qty,
      carbs_g: food.carbs_g * qty,
      fat_g: food.fat_g * qty,
      fiber_g: (food.fiber_g || 0) * qty,
      sugar_g: (food.sugar_g || 0) * qty,
      sodium_mg: (food.sodium_mg || 0) * qty,
      portion_g: food.serving_size ? food.serving_size * qty : null,
      ai_explanation: food.ai_explanation || null,
      cuisine: food.cuisine || null,
    });
    await loadData();
  };

  const handleDeleteLog = async (id: number) => {
    await api.delete(`/ai/meals/log/${id}`);
    await loadData();
  };

  const handleToggleConsumed = async (id: number, val: number) => {
    await api.put(`/ai/meals/log/${id}/consume`, { is_consumed: val });
    await loadData();
  };

  const handleEndDay = async () => {
    if (endingDay || (dayEnded && !DEV_ALWAYS_ALLOW_END_DAY)) return;
    setEndingDay(true);
    try {
      const r = await api.post<{
        message: string;
        today_summary: { date?: string } & Record<string, unknown>;
        tomorrow_plan: Record<string, unknown>;
      }>("/ai/meals/end-day", {});
      setDayEnded(true);
      setLastEndedDate(r.today_summary?.date || null);
      setTomorrowPlan(r.tomorrow_plan || null);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEndingDay(false);
    }
  };

  const handleAddWater = async (ml: number) => {
    await api.post("/ai/water/log", { amount_ml: ml });
    await loadData();
  };

  if (authLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  if (!hasProfile)
    return (
      <ProfileSetup
        inline
        onDone={() => {
          refreshUser();
        }}
      />
    );

  // First load only — once `stats` has loaded once, subsequent refetches
  // (log/delete/toggle/end-day/refresh) shouldn't flash the whole page back
  // to a skeleton.
  if (dataLoading && !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-14 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Macro rings */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-card border rounded-xl p-4 flex flex-col items-center gap-2"
            >
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>

        {/* Water card */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-2 w-full rounded-full mb-3" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Meal-log accordions */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>

        {/* End-day panel */}
        <Skeleton className="h-40 w-full rounded-2xl" />

        {/* Body metrics card */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5 flex flex-col items-center">
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totals = todayMeals?.totals;
  const targets = todayMeals?.targets;
  const water = todayMeals?.water;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground mt-0.5">
          Log your meals through the day — breakfast, lunch, snacks, then dinner
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Calories Burned",
              value: stats.calories_out,
              icon: <Zap className="h-4 w-4 text-yellow-500" />,
              sub: "kcal today",
            },
            {
              label: "Exercise This Week",
              value: `${stats.exercise_mins_this_week}m`,
              icon: <Clock className="h-4 w-4 text-emerald-500" />,
              sub: "minutes active",
            },
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

      {totals && targets && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MacroRing
            label="Calories"
            value={totals.calories}
            target={targets.calories}
            unit=" kcal"
            stroke="#f97316"
            icon={Flame}
          />
          <MacroRing
            label="Protein"
            value={totals.protein_g}
            target={targets.protein_g}
            unit="g"
            stroke="#3b82f6"
            icon={Dumbbell}
          />
          <MacroRing
            label="Carbs"
            value={totals.carbs_g}
            target={targets.carbs_g}
            unit="g"
            stroke="#22c55e"
            icon={Wheat}
          />
          <MacroRing
            label="Fat"
            value={totals.fat_g}
            target={targets.fat_g}
            unit="g"
            stroke="#eab308"
            icon={Droplet}
          />
        </div>
      )}

      {water && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              Water Intake — {water.consumed_ml}ml / {water.target_ml}ml (
              {water.pct}%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={Math.min(100, water.pct)} className="mb-3" />
            <div className="flex flex-wrap gap-2">
              {WATER_AMOUNTS.map((ml) => (
                <button
                  key={ml}
                  onClick={() => handleAddWater(ml)}
                  className="px-3 py-1 text-xs border rounded-full hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                >
                  +{ml}ml
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Today's Meals</h2>
        <div className="space-y-2">
          {MEAL_TYPES.map((mt) => (
            <MealSection
              key={mt.key}
              mealType={mt.key}
              icon={mt.icon}
              label={mt.label}
              classLabel={mt.class}
              logs={todayMeals?.meals[mt.key] ?? []}
              onLog={handleLogMeal}
              onDelete={handleDeleteLog}
              onToggleConsumed={handleToggleConsumed}
              disabled={dayEnded}
            />
          ))}
        </div>
      </div>

      {(!dayEnded || DEV_ALWAYS_ALLOW_END_DAY) && (
        <div className="border-2 border-dashed border-emerald-200 rounded-2xl p-6 flex flex-col items-center gap-3 bg-emerald-50/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-900">
              Done eating for today?
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Click to save today's nutrition, get tomorrow's meal plan, and
              check your exercise recommendation.
            </p>
            {DEV_ALWAYS_ALLOW_END_DAY && dayEnded && (
              <p className="text-xs text-amber-600 mt-1 flex items-center justify-center gap-1">
                <FlaskConical className="h-3 w-3 shrink-0" />
                Dev mode: last ended day{" "}
                {lastEndedDate ? `= ${lastEndedDate}` : ""} — clicking again
                simulates the next day.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={handleEndDay} disabled={endingDay}>
              {endingDay ? "Saving..." : "End Meal Today"}
            </Button>
            <Button
              variant={"primary-outline"}
              onClick={() =>
                navigate("/trainee/ai-recommendations?tab=exercise")
              }
            >
              Check Exercise
            </Button>
          </div>
        </div>
      )}
      {dayEnded && (
        <div className="border border-emerald-300 rounded-2xl p-6 bg-emerald-50 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="font-semibold text-emerald-800">
              Today's meals saved! Tomorrow's plan is ready.
            </p>
          </div>
          {tomorrowPlan && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Tomorrow's AI Recommendations:
              </p>
              {Object.entries(
                (
                  tomorrowPlan as Record<
                    string,
                    Record<
                      string,
                      { recommendations: { name: string; calories: number }[] }
                    >
                  >
                )?.meal_plan || {},
              ).map(([mt, data]) => {
                const first = data?.recommendations?.[0];
                return first ? (
                  <div key={mt} className="flex items-center gap-2 text-sm">
                    <span className="capitalize font-medium w-20 text-gray-600">
                      {mt}:
                    </span>
                    <span className="text-gray-800">{first.name}</span>
                    <span className="text-muted-foreground text-xs">
                      ({Math.round(first.calories)} kcal)
                    </span>
                  </div>
                ) : null;
              })}
            </div>
          )}
          <Button
            variant={"primary-outline"}
            onClick={() => navigate("/trainee/ai-recommendations?tab=exercise")}
          >
            Check Exercise Recommendation
          </Button>
        </div>
      )}

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
