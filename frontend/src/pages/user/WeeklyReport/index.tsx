import { useEffect, useState } from "react";
import { BarChart3, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

      <StatCards summary={summary} />
      <NutritionCharts dailyData={daily_data} targets={targets} />
      <ExerciseSummary summary={summary} dailyData={daily_data} />
      <HydrationTracking dailyData={daily_data} />
      <DailyBreakdownTable dailyData={daily_data} targets={targets} />
    </div>
  );
}
