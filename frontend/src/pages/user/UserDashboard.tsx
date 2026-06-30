import { useEffect, useState } from "react";
import { Zap, Clock, ShoppingBag, Bell } from "lucide-react";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import ProfileSetup from "./profile/ProfileSetup";
import type { DashboardStats } from "@/types";

const today = new Date().toISOString().split("T")[0];

export default function UserDashboard() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasProfile = Boolean((user as any)?.full_name);

  useEffect(() => {
    if (!hasProfile) return;
    api
      .get<DashboardStats>(`/user/dashboard?date=${today}`)
      .then(setStats)
      .catch((e) => setError((e as Error).message));
  }, [hasProfile]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <ProfileSetup
        inline
        onDone={() => {
          refreshUser();
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
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
    </div>
  );
}
