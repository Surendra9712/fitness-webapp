import { useEffect, useState } from "react";
import {
  BarChart3,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/TableSkeleton";
import type { WeeklyData } from "./types";
import StatCards from "./StatCards";
import NutritionCharts from "./NutritionCharts";
import ExerciseSummary from "./ExerciseSummary";
import HydrationTracking from "./HydrationTracking";
import DailyBreakdownTable from "./DailyBreakdownTable";
import { exportWeeklyReportPdf } from "./exportPdf";

export default function WeeklyReport() {
  const { user } = useAuth();
  const [report, setReport] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekOffset, setWeekOffset] = useState(0); // 0=current, -1=last week

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
    const userName =
      (user as Record<string, unknown>)?.full_name?.toString() || "User";
    const goal = (user as Record<string, unknown>)?.goal?.toString() || "—";
    exportWeeklyReportPdf(report, userName, goal);
  };

  if (loading)
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
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
                <Skeleton className="h-7 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Nutrition chart */}
        <Skeleton className="h-80 w-full rounded-2xl" />

        {/* Exercise summary + hydration tracking */}
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />

        {/* Daily breakdown table (9 columns: Day, Cal, Protein, Carbs, Fat, Burned, Ex.Min, Water, Exercises) */}
        <TableSkeleton rows={7} columns={9} />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {report.is_finalized && (
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700 text-xs gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Finalized
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

      <StatCards summary={summary} />
      <NutritionCharts dailyData={daily_data} targets={targets} />
      <ExerciseSummary summary={summary} dailyData={daily_data} />
      <HydrationTracking dailyData={daily_data} />
      <DailyBreakdownTable dailyData={daily_data} targets={targets} />
    </div>
  );
}
