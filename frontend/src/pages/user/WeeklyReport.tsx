import { useEffect, useState, useRef } from "react";
import {
  BarChart3,
  TrendingUp,
  Flame,
  Dumbbell,
  Droplets,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  workout_count: number;
  exercises_done: string;
  water_ml: number;
  water_pct: number;
}
interface Summary {
  avg_calories: number;
  avg_protein_g: number;
  avg_carbs_g: number;
  avg_fat_g: number;
  target_calories: number;
  adherence_pct: number;
  days_logged: number;
  total_meals: number;
  total_calories_burned: number;
  total_exercise_mins: number;
  total_workouts: number;
  most_frequent_exercise: string | null;
  avg_water_ml: number;
  water_target_ml: number;
}
interface WeeklyData {
  week_start: string;
  week_end: string;
  daily_data: DayData[];
  summary: Summary;
  targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  };
  is_finalized?: boolean;
  finalized_at?: string;
}

const DAY = (s: string) => s.slice(0, 3);

function BarChart({
  data,
  target,
  color,
  label,
}: {
  data: number[];
  target: number;
  color: string;
  label: string;
}) {
  const max = Math.max(...data, target, 1);
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-end gap-1 h-20">
        {data.map((v, i) => {
          const pct = Math.min(100, (v / max) * 100);
          const over = v > target * 1.1;
          const on = Math.abs(v - target) / target < 0.1;
          const bg =
            v === 0
              ? "bg-muted"
              : over
                ? "bg-yellow-400"
                : on
                  ? "bg-emerald-400"
                  : color;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end gap-0.5 h-full"
            >
              {v > 0 && (
                <span className="text-[9px] text-muted-foreground">
                  {Math.round(v)}
                </span>
              )}
              <div
                className={`w-full rounded-t-sm ${bg}`}
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[9px] text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WeeklyReport() {
  const { user } = useAuth();
  const [report, setReport] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekOffset, setWeekOffset] = useState(0); // 0=current, -1=last week
  const printRef = useRef<HTMLDivElement>(null);

  const loadReport = async (offset: number) => {
    setLoading(true);
    setError("");
    try {
      let url = "/ai/report/weekly";
      if (offset !== 0) {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay() + 1 + offset * 7); // Monday
        const ws = d.toISOString().split("T")[0];
        url += `?week_start=${ws}`;
      }
      const data = await api.get<WeeklyData>(url);
      setReport(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(weekOffset);
  }, [weekOffset]);

  const handleExportPDF = () => {
    if (!report) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const { summary, daily_data, targets, week_start, week_end } = report;
    const userName =
      (user as Record<string, unknown>)?.full_name?.toString() || "User";
    const goal = (user as Record<string, unknown>)?.goal?.toString() || "—";

    const rows = daily_data
      .map(
        (d) => `
      <tr style="border-bottom:1px solid #eee">
        <td style="padding:6px 8px">${d.day_name.slice(0, 3)} ${d.date.slice(5)}</td>
        <td style="padding:6px 8px;text-align:center">${Math.round(d.calories)}</td>
        <td style="padding:6px 8px;text-align:center">${Math.round(d.protein_g)}</td>
        <td style="padding:6px 8px;text-align:center">${Math.round(d.carbs_g)}</td>
        <td style="padding:6px 8px;text-align:center">${Math.round(d.fat_g)}</td>
        <td style="padding:6px 8px;text-align:center">${d.meal_count}</td>
        <td style="padding:6px 8px;text-align:center">${Math.round(d.calories_burned)}</td>
        <td style="padding:6px 8px;text-align:center">${d.exercise_minutes}</td>
        <td style="padding:6px 8px;text-align:center">${d.water_ml}</td>
      </tr>`,
      )
      .join("");

    win.document.write(`<!DOCTYPE html><html><head>
      <title>SmartDiet Pro — Weekly Report</title>
      <style>
        body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px}
        h1{color:#059669;margin-bottom:4px}
        h2{color:#059669;font-size:15px;margin:24px 0 8px}
        .meta{color:#666;font-size:12px;margin-bottom:24px}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .stat{background:#f0fdf4;border:1px solid #d1fae5;border-radius:8px;padding:12px;text-align:center}
        .stat-val{font-size:22px;font-weight:700;color:#059669}
        .stat-label{font-size:11px;color:#6b7280;margin-top:2px}
        table{width:100%;border-collapse:collapse;margin-bottom:24px}
        th{background:#f0fdf4;padding:8px;text-align:left;font-size:12px;color:#374151}
        td{font-size:12px}
        .footer{color:#9ca3af;font-size:11px;text-align:center;margin-top:32px;border-top:1px solid #eee;padding-top:16px}
        @media print{body{padding:16px}}
      </style>
    </head><body>
      <h1>SmartDiet Pro — Weekly Nutrition & Exercise Report</h1>
      <div class="meta">
        <b>User:</b> ${userName} &nbsp;|&nbsp;
        <b>Goal:</b> ${goal} &nbsp;|&nbsp;
        <b>Period:</b> ${week_start} to ${week_end} &nbsp;|&nbsp;
        <b>Generated:</b> ${new Date().toLocaleDateString()}
      </div>

      <h2>📊 Weekly Nutrition Summary</h2>
      <div class="grid">
        <div class="stat"><div class="stat-val">${Math.round(summary.avg_calories)}</div><div class="stat-label">Avg Calories/day</div></div>
        <div class="stat"><div class="stat-val">${Math.round(summary.avg_protein_g)}g</div><div class="stat-label">Avg Protein/day</div></div>
        <div class="stat"><div class="stat-val">${Math.round(summary.avg_carbs_g)}g</div><div class="stat-label">Avg Carbs/day</div></div>
        <div class="stat"><div class="stat-val">${Math.round(summary.avg_fat_g)}g</div><div class="stat-label">Avg Fat/day</div></div>
        <div class="stat"><div class="stat-val">${summary.adherence_pct}%</div><div class="stat-label">Goal Adherence</div></div>
        <div class="stat"><div class="stat-val">${summary.days_logged}/7</div><div class="stat-label">Days Logged</div></div>
        <div class="stat"><div class="stat-val">${summary.total_meals}</div><div class="stat-label">Total Meals</div></div>
        <div class="stat"><div class="stat-val">${Math.round(summary.avg_water_ml)}ml</div><div class="stat-label">Avg Water/day</div></div>
      </div>

      <h2>🏋️ Weekly Exercise Summary</h2>
      <div class="grid">
        <div class="stat"><div class="stat-val">${summary.total_workouts}</div><div class="stat-label">Total Workouts</div></div>
        <div class="stat"><div class="stat-val">${summary.total_exercise_mins}m</div><div class="stat-label">Total Active Time</div></div>
        <div class="stat"><div class="stat-val">${Math.round(summary.total_calories_burned)}</div><div class="stat-label">Calories Burned</div></div>
        <div class="stat"><div class="stat-val">${summary.most_frequent_exercise || "—"}</div><div class="stat-label">Most Done Exercise</div></div>
      </div>

      <h2>💧 Hydration Summary</h2>
      <div class="grid">
        <div class="stat"><div class="stat-val">${Math.round(summary.avg_water_ml)}ml</div><div class="stat-label">Avg Water/Day</div></div>
        <div class="stat"><div class="stat-val">${summary.water_target_ml}ml</div><div class="stat-label">Daily Target</div></div>
        <div class="stat"><div class="stat-val">${Math.round((summary.avg_water_ml / summary.water_target_ml) * 100)}%</div><div class="stat-label">Avg Hydration %</div></div>
        <div class="stat"><div class="stat-val">${daily_data.filter((d: DayData) => d.water_ml >= summary.water_target_ml).length}/7</div><div class="stat-label">Days Target Met</div></div>
      </div>

      <h2>📅 Daily Breakdown</h2>
      <table>
        <thead><tr>
          <th>Day</th><th>Calories</th><th>Protein(g)</th><th>Carbs(g)</th><th>Fat(g)</th>
          <th>Meals</th><th>Cal Burned</th><th>Ex.Min</th><th>Water(ml)</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="font-weight:700;background:#f9fafb">
          <td style="padding:8px">Targets</td>
          <td style="padding:8px;text-align:center">${Math.round(targets.calories)}</td>
          <td style="padding:8px;text-align:center">${Math.round(targets.protein_g)}</td>
          <td style="padding:8px;text-align:center">${Math.round(targets.carbs_g)}</td>
          <td style="padding:8px;text-align:center">${Math.round(targets.fat_g)}</td>
          <td colspan="4"></td>
        </tr></tfoot>
      </table>
      <div class="footer">SmartDiet Pro · AI-Powered Nutrition Tracking · Nepal</div>
      <script>window.onload=()=>{window.print();}</script>
    </body></html>`);
    win.document.close();
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  if (!report) return null;

  const { summary, daily_data, targets } = report;

  return (
    <div className="space-y-6" ref={printRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Weekly Report
              </h1>
              {report.is_finalized && (
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700 text-xs"
                >
                  ✅ Finalized
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(report.week_start).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              –{" "}
              {new Date(report.week_end).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {report.is_finalized && report.finalized_at && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (Finalized{" "}
                  {new Date(report.finalized_at).toLocaleDateString()})
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="p-2 border rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground px-2">
            {weekOffset === 0 ? "This Week" : "Last Week"}
          </span>
          <button
            onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
            disabled={weekOffset === 0}
            className="p-2 border rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Nutrition summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Avg Daily Calories",
            value: `${Math.round(summary.avg_calories)} kcal`,
            icon: <Flame className="h-4 w-4 text-orange-500" />,
            sub: `Target: ${Math.round(summary.target_calories)} kcal`,
          },
          {
            label: "Adherence",
            value: `${summary.adherence_pct}%`,
            icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
            sub: `${summary.days_logged}/7 days logged`,
          },
          {
            label: "Total Workouts",
            value: summary.total_workouts,
            icon: <Dumbbell className="h-4 w-4 text-blue-500" />,
            sub: `${summary.total_exercise_mins} min · ${Math.round(summary.total_calories_burned)} kcal burned`,
          },
          {
            label: "Avg Water",
            value: `${Math.round(summary.avg_water_ml)}ml`,
            icon: <Droplets className="h-4 w-4 text-sky-500" />,
            sub: `Target: ${summary.water_target_ml}ml/day`,
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
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar charts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Daily Nutrition vs Targets
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-6">
          <BarChart
            data={daily_data.map((d) => d.calories)}
            target={targets.calories}
            color="bg-orange-400"
            label={`Calories (target ${Math.round(targets.calories)})`}
          />
          <BarChart
            data={daily_data.map((d) => d.protein_g)}
            target={targets.protein_g}
            color="bg-blue-400"
            label={`Protein g (target ${Math.round(targets.protein_g)})`}
          />
          <BarChart
            data={daily_data.map((d) => d.carbs_g)}
            target={targets.carbs_g}
            color="bg-green-400"
            label={`Carbs g (target ${Math.round(targets.carbs_g)})`}
          />
          <BarChart
            data={daily_data.map((d) => d.calories_burned)}
            target={0}
            color="bg-purple-400"
            label="Calories Burned (exercise)"
          />
        </CardContent>
      </Card>

      {/* Exercise summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Exercise Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: "Workouts", value: summary.total_workouts },
              { label: "Active Minutes", value: summary.total_exercise_mins },
              {
                label: "Calories Burned",
                value: Math.round(summary.total_calories_burned),
              },
              {
                label: "Most Done",
                value: summary.most_frequent_exercise || "—",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="space-y-1 p-3 bg-muted/30 rounded-xl"
              >
                <p className="text-xl font-bold text-primary">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
          {/* Workout consistency dots */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Workout Consistency
            </p>
            <div className="flex gap-2">
              {daily_data.map((d) => (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${d.workout_count > 0 ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {d.workout_count > 0 ? d.workout_count : "–"}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {DAY(d.day_name)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Water tracking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Droplets className="h-4 w-4 text-sky-500" />
            Hydration Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {daily_data.map((d) => (
              <div key={d.date} className="flex items-center gap-3">
                <span className="text-xs w-8 text-muted-foreground">
                  {DAY(d.day_name)}
                </span>
                <div className="flex-1 bg-secondary rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-sky-400 transition-all"
                    style={{ width: `${Math.min(100, d.water_pct)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {d.water_ml}ml ({Math.round(d.water_pct)}%)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Day-by-day table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Day-by-Day Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 pr-4">Day</th>
                  <th className="text-right py-2 px-2">Cal</th>
                  <th className="text-right py-2 px-2">Protein</th>
                  <th className="text-right py-2 px-2">Carbs</th>
                  <th className="text-right py-2 px-2">Fat</th>
                  <th className="text-right py-2 px-2">Burned</th>
                  <th className="text-right py-2 px-2">Ex.Min</th>
                  <th className="text-right py-2 px-2">Water</th>
                  <th className="text-left py-2 pl-2">Exercises</th>
                </tr>
              </thead>
              <tbody>
                {daily_data.map((d) => (
                  <tr
                    key={d.date}
                    className={`border-b last:border-b-0 ${d.meal_count === 0 ? "opacity-40" : ""}`}
                  >
                    <td className="py-2 pr-4 font-medium">
                      {d.day_name.slice(0, 3)}{" "}
                      <span className="text-muted-foreground font-normal">
                        {d.date.slice(5)}
                      </span>
                    </td>
                    <td className="text-right py-2 px-2">
                      {d.meal_count > 0 ? Math.round(d.calories) : "—"}
                    </td>
                    <td className="text-right py-2 px-2">
                      {d.meal_count > 0 ? `${Math.round(d.protein_g)}g` : "—"}
                    </td>
                    <td className="text-right py-2 px-2">
                      {d.meal_count > 0 ? `${Math.round(d.carbs_g)}g` : "—"}
                    </td>
                    <td className="text-right py-2 px-2">
                      {d.meal_count > 0 ? `${Math.round(d.fat_g)}g` : "—"}
                    </td>
                    <td className="text-right py-2 px-2">
                      {d.calories_burned > 0
                        ? Math.round(d.calories_burned)
                        : "—"}
                    </td>
                    <td className="text-right py-2 px-2">
                      {d.exercise_minutes > 0 ? d.exercise_minutes : "—"}
                    </td>
                    <td className="text-right py-2 px-2">
                      {d.water_ml > 0 ? `${d.water_ml}ml` : "—"}
                    </td>
                    <td className="text-left py-2 pl-2 text-xs text-muted-foreground max-w-32 truncate">
                      {d.exercises_done || "—"}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold text-xs bg-muted/20">
                  <td className="py-2 pr-4">Targets</td>
                  <td className="text-right py-2 px-2">
                    {Math.round(targets.calories)}
                  </td>
                  <td className="text-right py-2 px-2">
                    {Math.round(targets.protein_g)}g
                  </td>
                  <td className="text-right py-2 px-2">
                    {Math.round(targets.carbs_g)}g
                  </td>
                  <td className="text-right py-2 px-2">
                    {Math.round(targets.fat_g)}g
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
