import { Droplets } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DayData } from "./types";
import { DAY } from "./types";

export default function HydrationTracking({
  dailyData,
}: {
  dailyData: DayData[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Droplets className="h-4 w-4 text-sky-500" />
          Hydration Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {dailyData.map((d) => (
            <div key={d.date} className="flex items-center gap-3">
              <span className="text-xs w-8 text-muted-foreground">
                {DAY(d.day_name)}
              </span>
              <Progress
                value={Math.min(100, d.water_pct)}
                className="h-2 flex-1 [&>div]:bg-sky-400"
              />
              <span className="text-xs text-muted-foreground w-16 text-right">
                {d.water_ml}ml ({Math.round(d.water_pct)}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
