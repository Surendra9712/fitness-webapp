import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  Clock,
  ShoppingBag,
  Bell,
  Activity,
  Flame,
  Droplets,
} from "lucide-react";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { DashboardStats, BodyMetrics } from "@/types";

const today = new Date().toISOString().split("T")[0];

// ── BMI Gauge ─────────────────────────────────────────────────────────────────

const BMI_MIN = 10;
const BMI_MAX = 40;

function toGaugeAngle(bmi: number) {
  return (
    ((Math.min(Math.max(bmi, BMI_MIN), BMI_MAX) - BMI_MIN) /
      (BMI_MAX - BMI_MIN)) *
    180
  );
}

function gaugePoint(cx: number, cy: number, r: number, gaugeDeg: number) {
  const rad = ((180 - gaugeDeg) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startBmi: number,
  endBmi: number,
) {
  const s = gaugePoint(cx, cy, r, toGaugeAngle(startBmi));
  const e = gaugePoint(cx, cy, r, toGaugeAngle(endBmi));
  const large = toGaugeAngle(endBmi) - toGaugeAngle(startBmi) > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

const BMI_ZONES = [
  { label: "Underweight", start: 10, end: 18.5, color: "#60a5fa" },
  { label: "Normal", start: 18.5, end: 25, color: "#34d399" },
  { label: "Overweight", start: 25, end: 30, color: "#fbbf24" },
  { label: "Obese", start: 30, end: 40, color: "#f87171" },
];

const BMI_CATEGORY_COLOR: Record<string, string> = {
  Underweight: "#60a5fa",
  Normal: "#34d399",
  Overweight: "#fbbf24",
  Obese: "#f87171",
};

function BmiGauge({ bmi, category }: { bmi: number; category: string }) {
  const cx = 110,
    cy = 100,
    r = 78,
    sw = 13;
  const needleDeg = toGaugeAngle(bmi);
  const tip = gaugePoint(cx, cy, r - 10, needleDeg);
  const accent = BMI_CATEGORY_COLOR[category] ?? "#34d399";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 220 110" className="w-full max-w-xs">
        {/* Track */}
        <path
          d={arcPath(cx, cy, r, BMI_MIN, BMI_MAX)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={sw}
        />
        {/* Coloured zones */}
        {BMI_ZONES.map((z) => (
          <path
            key={z.label}
            d={arcPath(cx, cy, r, z.start, z.end)}
            fill="none"
            stroke={z.color}
            strokeWidth={sw}
            strokeLinecap="butt"
          />
        ))}
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={tip.x}
          y2={tip.y}
          stroke="#111827"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill="#111827" />
        {/* Value */}
        <text
          x={cx}
          y={cy - 18}
          textAnchor="middle"
          fontSize={22}
          fontWeight="700"
          fill="#111827"
        >
          {bmi}
        </text>
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize={10}
          fill={accent}
          fontWeight="600"
        >
          {category}
        </text>
        {/* Min / Max labels */}
        <text
          x={cx - r - 4}
          y={cy + 14}
          textAnchor="end"
          fontSize={9}
          fill="#9ca3af"
        >
          10
        </text>
        <text
          x={cx + r + 4}
          y={cy + 14}
          textAnchor="start"
          fontSize={9}
          fill="#9ca3af"
        >
          40
        </text>
      </svg>
      {/* Zone legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {BMI_ZONES.map((z) => (
          <span
            key={z.label}
            className="flex items-center gap-1 text-xs text-gray-500"
          >
            <span
              className="h-2 w-2 rounded-full inline-block"
              style={{ background: z.color }}
            />
            {z.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Macro Donut ───────────────────────────────────────────────────────────────

const MACRO_CONFIG = [
  { key: "protein", label: "Protein", color: "#a78bfa", calPerG: 4 },
  { key: "carbs", label: "Carbs", color: "#60a5fa", calPerG: 4 },
  { key: "fat", label: "Fat", color: "#fbbf24", calPerG: 9 },
] as const;

function MacroDonut({ macros }: { macros: BodyMetrics["macros"] }) {
  const cx = 60,
    cy = 60,
    r = 44,
    sw = 14;
  const circumference = 2 * Math.PI * r;

  const cals = MACRO_CONFIG.map((m) => ({
    ...m,
    kcal: macros[m.key] * m.calPerG,
  }));
  const totalKcal = cals.reduce((s, m) => s + m.kcal, 0) || 1;

  let offset = 0;
  const segments = cals.map((m) => {
    const dash = (m.kcal / totalKcal) * circumference;
    const gap = circumference - dash;
    const currentOffset = offset;
    offset += dash;
    return { ...m, dash, gap, offset: currentOffset };
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 120 120" className="w-28 h-28 shrink-0 -rotate-90">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={sw}
        />
        {segments.map((s) => (
          <circle
            key={s.key}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={sw}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={-s.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="flex flex-col gap-2 min-w-0">
        {MACRO_CONFIG.map((m) => {
          const grams = macros[m.key];
          const pct = Math.round(((grams * m.calPerG) / totalKcal) * 100);
          return (
            <div key={m.key} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: m.color }}
              />
              <span className="text-sm font-medium text-gray-700 w-14">
                {m.label}
              </span>
              <span className="text-sm text-gray-900 font-semibold">
                {grams}g
              </span>
              <span className="text-xs text-gray-400 ml-auto">{pct}%</span>
            </div>
          );
        })}
        <div className="mt-1 pt-1 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Total macros ≈ {Math.round(totalKcal)} kcal
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  unit,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ background: `${accent}18` }}
      >
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">
          {value.toLocaleString()}
          <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function UserDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<DashboardStats>(`/user/dashboard?date=${today}`)
      .then(setStats)
      .catch((e) => setError((e as Error).message));
  }, []);

  const m = stats?.metrics;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {/* Activity stats */}
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
      {/* Body metrics */}
      {m ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-gray-800">
            Body Metrics
          </h2>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* BMI gauge */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-emerald-500" /> BMI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BmiGauge bmi={m.bmi} category={m.bmi_category} />
              </CardContent>
            </Card>

            {/* BMR + TDEE */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <MetricCard
                icon={<Flame className="h-5 w-5" />}
                label="Basal Metabolic Rate (BMR)"
                value={m.bmr}
                unit="kcal/day"
                sub="Calories your body burns completely at rest"
                accent="#f97316"
              />
              <MetricCard
                icon={<Zap className="h-5 w-5" />}
                label="Total Daily Energy Expenditure (TDEE)"
                value={m.tdee}
                unit="kcal/day"
                sub="BMR × activity multiplier — your true maintenance"
                accent="#8b5cf6"
              />
              <MetricCard
                icon={<Droplets className="h-5 w-5" />}
                label="Daily Calorie Target"
                value={m.daily_calories}
                unit="kcal/day"
                sub="Adjusted for your goal (lose / gain / maintain)"
                accent="#10b981"
              />
            </div>
          </div>

          {/* Macro breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Daily Macro Targets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MacroDonut macros={m.macros} />
            </CardContent>
          </Card>
        </section>
      ) : (
        stats && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-gray-500">
              Complete your profile to see BMI, BMR, and TDEE.{" "}
              <Link
                to="/customer/profile"
                className="text-emerald-600 font-medium hover:underline"
              >
                Set up profile →
              </Link>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
