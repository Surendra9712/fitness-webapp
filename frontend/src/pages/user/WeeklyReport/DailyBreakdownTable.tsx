import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DayData, WeeklyTargets } from "./types";

export default function DailyBreakdownTable({
  dailyData,
  targets,
}: {
  dailyData: DayData[];
  targets: WeeklyTargets;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Day-by-Day Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-auto px-2 py-2 text-xs">Day</TableHead>
              <TableHead className="h-auto px-2 py-2 text-right text-xs">
                Cal
              </TableHead>
              <TableHead className="h-auto px-2 py-2 text-right text-xs">
                Protein
              </TableHead>
              <TableHead className="h-auto px-2 py-2 text-right text-xs">
                Carbs
              </TableHead>
              <TableHead className="h-auto px-2 py-2 text-right text-xs">
                Fat
              </TableHead>
              <TableHead className="h-auto px-2 py-2 text-right text-xs">
                Burned
              </TableHead>
              <TableHead className="h-auto px-2 py-2 text-right text-xs">
                Ex.Min
              </TableHead>
              <TableHead className="h-auto px-2 py-2 text-right text-xs">
                Water
              </TableHead>
              <TableHead className="h-auto px-2 py-2 text-xs">
                Exercises
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dailyData.map((d) => (
              <TableRow
                key={d.date}
                className={d.meal_count === 0 ? "opacity-40" : ""}
              >
                <TableCell className="px-2 py-2 font-medium">
                  {d.day_name.slice(0, 3)}{" "}
                  <span className="text-muted-foreground font-normal">
                    {d.date.slice(5)}
                  </span>
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  {d.meal_count > 0 ? Math.round(d.calories) : "—"}
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  {d.meal_count > 0 ? `${Math.round(d.protein_g)}g` : "—"}
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  {d.meal_count > 0 ? `${Math.round(d.carbs_g)}g` : "—"}
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  {d.meal_count > 0 ? `${Math.round(d.fat_g)}g` : "—"}
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  {d.calories_burned > 0 ? Math.round(d.calories_burned) : "—"}
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  {d.exercise_minutes > 0 ? d.exercise_minutes : "—"}
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  {d.water_ml > 0 ? `${d.water_ml}ml` : "—"}
                </TableCell>
                <TableCell className="max-w-32 truncate px-2 py-2 text-xs text-muted-foreground">
                  {d.exercises_done || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="px-2 py-2 text-xs">Targets</TableCell>
              <TableCell className="px-2 py-2 text-right text-xs">
                {Math.round(targets.calories)}
              </TableCell>
              <TableCell className="px-2 py-2 text-right text-xs">
                {Math.round(targets.protein_g)}g
              </TableCell>
              <TableCell className="px-2 py-2 text-right text-xs">
                {Math.round(targets.carbs_g)}g
              </TableCell>
              <TableCell className="px-2 py-2 text-right text-xs">
                {Math.round(targets.fat_g)}g
              </TableCell>
              <TableCell colSpan={4} />
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
