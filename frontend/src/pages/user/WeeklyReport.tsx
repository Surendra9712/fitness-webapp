import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Flame, Dumbbell } from "lucide-react";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface DayData {
  date: string;
  day_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_count: number;
  calories_burned: number;
  exercise_minutes: number;
}

interface WeekSummary {
  avg_calories: number;
  avg_protein_g: number;
  avg_carbs_g: number;
  avg_fat_g: number;
  target_calories: number;
  adherence_pct: number;
  days_logged: number;
  total_meals: number;
}

interface WeeklyReportData {
  week_start: string;
  week_end: string;
  daily_data: DayData[];
  summary: WeekSummary;
  targets: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

const DAY_ABBR: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

export default function WeeklyReport() {
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<WeeklyReportData>("/ai/report/weekly")
      .then(setReport)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>
  );

  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;

  if (!report) return null;

  const { summary, daily_data, targets } = report;
  const maxCal = Math.max(...daily_data.map(d => d.calories), targets.calories, 1);

  const adherenceColor =
    summary.adherence_pct >= 90 ? "bg-green-500" :
    summary.adherence_pct >= 70 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Report</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(report.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
            {new Date(report.week_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Avg Daily Calories", value: `${Math.round(summary.avg_calories)} kcal`, icon: <Flame className="h-4 w-4 text-orange-500" />, sub: `Target: ${Math.round(summary.target_calories)} kcal` },
          { label: "Adherence", value: `${summary.adherence_pct}%`, icon: <TrendingUp className="h-4 w-4 text-emerald-500" />, sub: "of calorie target" },
          { label: "Days Logged", value: `${summary.days_logged} / 7`, icon: <BarChart3 className="h-4 w-4 text-blue-500" />, sub: "days with meals" },
          { label: "Total Meals", value: summary.total_meals, icon: <Dumbbell className="h-4 w-4 text-purple-500" />, sub: "meal entries" },
        ].map(s => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              {s.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calorie bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Daily Calorie Intake</span>
            <Badge variant="outline" className="font-normal text-xs">
              Target: {Math.round(targets.calories)} kcal/day
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Bar chart */}
          <div className="flex items-end gap-2 h-40 pt-2 pb-1">
            {/* Target line */}
            <div className="relative w-full flex items-end gap-2 h-full">
              {daily_data.map(d => {
                const pct = Math.min(100, (d.calories / maxCal) * 100);
                const atTarget = Math.abs(d.calories - targets.calories) / targets.calories < 0.1;
                const over = d.calories > targets.calories * 1.1;
                const barColor = d.calories === 0 ? "bg-muted" : over ? "bg-yellow-400" : atTarget ? "bg-green-400" : "bg-primary/70";
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                    <span className="text-xs text-muted-foreground">
                      {d.calories > 0 ? Math.round(d.calories) : ""}
                    </span>
                    <div className="w-full rounded-t-sm transition-all" style={{ height: `${Math.max(pct, 2)}%` }}>
                      <div className={`w-full h-full rounded-t-sm ${barColor}`} />
                    </div>
                    <span className="text-xs font-medium">{DAY_ABBR[d.day_name] || d.day_name}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-400 inline-block" /> On target (±10%)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-400 inline-block" /> Over target</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-primary/70 inline-block" /> Under target</span>
          </div>
        </CardContent>
      </Card>

      {/* Macro averages */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Average Daily Macros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Protein", avg: summary.avg_protein_g, target: targets.protein_g, unit: "g", color: "bg-blue-400" },
            { label: "Carbs",   avg: summary.avg_carbs_g,   target: targets.carbs_g,   unit: "g", color: "bg-green-400" },
            { label: "Fat",     avg: summary.avg_fat_g,     target: targets.fat_g,     unit: "g", color: "bg-yellow-400" },
          ].map(m => (
            <div key={m.label} className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="font-medium">{m.label}</span>
                <span>{Math.round(m.avg)}{m.unit} / {Math.round(m.target)}{m.unit}</span>
              </div>
              <Progress
                value={Math.min(100, m.target > 0 ? (m.avg / m.target) * 100 : 0)}
                className="h-2"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Day by day breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Day-by-Day Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {daily_data.map(d => (
            <div key={d.date} className={`flex items-center justify-between py-2 border-b last:border-b-0 ${d.meal_count === 0 ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium w-10">{DAY_ABBR[d.day_name]}</span>
                <span className="text-xs text-muted-foreground">{d.date}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {d.meal_count > 0 ? (
                  <>
                    <span>🔥 {Math.round(d.calories)} kcal</span>
                    <span>💪 P{Math.round(d.protein_g)}g</span>
                    <span>🌾 C{Math.round(d.carbs_g)}g</span>
                    {d.exercise_minutes > 0 && <span>🏋️ {d.exercise_minutes}min</span>}
                    <Badge variant="secondary" className="text-xs">{d.meal_count} meals</Badge>
                  </>
                ) : (
                  <span className="text-muted-foreground">No meals logged</span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
