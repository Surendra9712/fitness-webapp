import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DAY } from "./types";
import type { DayData } from "./types";

const METRICS = [
  {
    key: "calories",
    valueKey: "caloriesValue",
    targetKey: "caloriesTarget",
    label: "Calories",
    unit: " kcal",
    color: "#fb923c",
  },
  {
    key: "protein_g",
    valueKey: "proteinValue",
    targetKey: "proteinTarget",
    label: "Protein",
    unit: "g",
    color: "#60a5fa",
  },
  {
    key: "carbs_g",
    valueKey: "carbsValue",
    targetKey: "carbsTarget",
    label: "Carbs",
    unit: "g",
    color: "#4ade80",
  },
  {
    key: "calories_burned",
    valueKey: "burnedValue",
    targetKey: null,
    label: "Calories Burned",
    unit: " kcal",
    color: "#c084fc",
  },
] as const;

interface ChartRow {
  day: string;
  caloriesValue: number;
  caloriesTarget: number;
  proteinValue: number;
  proteinTarget: number;
  carbsValue: number;
  carbsTarget: number;
  burnedValue: number;
}

function statusLabel(value: number, target: number | null) {
  if (target === null || target <= 0) return null;
  if (value === 0) return "No data";
  if (value > target * 1.1) return "Over target";
  if (Math.abs(value - target) / target < 0.1) return "On target";
  return null;
}

function NutritionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="min-w-42.5 space-y-1 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{d.day}</p>
      {METRICS.map((m) => {
        const value = d[m.valueKey];
        const target = m.targetKey ? d[m.targetKey] : null;
        const status = statusLabel(value, target);
        return (
          <div key={m.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              {m.label}
            </span>
            <span className="text-popover-foreground">
              {Math.round(value)}
              {m.unit}
              {status && (
                <span className="text-muted-foreground"> — {status}</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function NutritionCharts({
  dailyData,
  targets,
}: {
  dailyData: DayData[];
  targets: { calories: number; protein_g: number; carbs_g: number };
}) {
  const chartData: ChartRow[] = dailyData.map((d) => ({
    day: DAY(d.day_name),
    caloriesValue: d.calories,
    caloriesTarget: targets.calories,
    proteinValue: d.protein_g,
    proteinTarget: targets.protein_g,
    carbsValue: d.carbs_g,
    carbsTarget: targets.carbs_g,
    burnedValue: d.calories_burned,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Daily Nutrition vs Targets</CardTitle>
        <p className="text-xs text-muted-foreground">
          Dashed lines mark each metric's daily target.
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            barGap={3}
            barCategoryGap="20%"
          >
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={40}
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <ReferenceLine
              y={targets.calories}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
            />
            <ReferenceLine
              y={targets.protein_g}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
            />
            <ReferenceLine
              y={targets.carbs_g}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))" }}
              content={<NutritionTooltip />}
            />
            {METRICS.map((m) => (
              <Bar
                key={m.key}
                dataKey={m.valueKey}
                name={m.label}
                fill={m.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={16}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 justify-center">
          {METRICS.map((m) => (
            <span
              key={m.key}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              {m.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
