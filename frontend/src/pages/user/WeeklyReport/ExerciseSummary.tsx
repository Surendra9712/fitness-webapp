import { Dumbbell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DayData, Summary } from "./types";
import { DAY } from "./types";

export default function ExerciseSummary({
  summary,
  dailyData,
}: {
  summary: Summary;
  dailyData: DayData[];
}) {
  const metrics = [
    { label: "Workouts", value: summary.total_workouts },
    { label: "Active Minutes", value: summary.total_exercise_mins },
    {
      label: "Calories Burned",
      value: Math.round(summary.total_calories_burned),
    },
    { label: "Most Done", value: summary.most_frequent_exercise || "—" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Dumbbell className="h-4 w-4" />
          Exercise Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {metrics.map((m) => (
            <div key={m.label} className="space-y-1 p-3 bg-muted/30 rounded-xl">
              <p className="text-xl font-bold text-primary">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Workout Consistency
          </p>
          <div className="flex gap-2">
            {dailyData.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
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
  );
}
