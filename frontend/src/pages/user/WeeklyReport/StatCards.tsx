import { TrendingUp, Flame, Dumbbell, Droplets } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Summary } from "./types";

export default function StatCards({ summary }: { summary: Summary }) {
  const stats = [
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
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
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
  );
}
