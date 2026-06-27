import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfYear } from "date-fns";
import {
  Users,
  UserCheck,
  Package,
  ShoppingBag,
  Bell,
  ClipboardList,
  DollarSign,
  UserPlus,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import useAdmin from "@/hooks/useAdmin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";

// ─── Constants ──────────────────────────────────────────────────────────────

// const roleBadge: Record<Role, 'destructive' | 'info' | 'success'> = {
//   admin: 'destructive', dietitian: 'info', trainee: 'success',
// }

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

type Preset = "year" | "90d" | "30d" | "7d" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "year", label: "This Year" },
  { key: "90d", label: "Last 90 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "7d", label: "Last 7 Days" },
  { key: "custom", label: "Custom" },
];

function presetDates(preset: Preset): { from: string; to: string } {
  const today = new Date();
  const toStr = format(today, "yyyy-MM-dd");
  if (preset === "year")
    return { from: format(startOfYear(today), "yyyy-MM-dd"), to: toStr };
  if (preset === "90d")
    return { from: format(subDays(today, 89), "yyyy-MM-dd"), to: toStr };
  if (preset === "30d")
    return { from: format(subDays(today, 29), "yyyy-MM-dd"), to: toStr };
  if (preset === "7d")
    return { from: format(subDays(today, 6), "yyyy-MM-dd"), to: toStr };
  return { from: format(startOfYear(today), "yyyy-MM-dd"), to: toStr };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000
      ? `${(n / 1000).toFixed(1)}k`
      : String(n);

const fmtCurrency = (n: number) => `Rs. ${fmt(n)}`;

// ─── Sub-components ─────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number | undefined;
  icon: React.ReactNode;
  iconBg: string;
  sub?: string;
  alert?: boolean;
  onClick?: () => void;
}
function StatCard({
  label,
  value,
  icon,
  iconBg,
  sub,
  alert,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={`transition-shadow hover:shadow-md ${onClick ? "cursor-pointer" : ""} ${alert && Number(value) > 0 ? "border-amber-400/60" : ""}`}
      onClick={onClick}
    >
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value ?? "—"}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}:{" "}
          <span className="font-semibold">
            {p.name === "Revenue" ? fmtCurrency(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [preset, setPreset] = useState<Preset>("year");
  const [dateFrom, setDateFrom] = useState(() => presetDates("year").from);
  const [dateTo, setDateTo] = useState(() => presetDates("year").to);

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") {
      const { from, to } = presetDates(p);
      setDateFrom(from);
      setDateTo(to);
    }
  }

  function handleCustomFrom(val: string) {
    setPreset("custom");
    setDateFrom(val);
  }
  function handleCustomTo(val: string) {
    setPreset("custom");
    setDateTo(val);
  }

  const { GetStats, GetStatsTrends } = useAdmin();
  const { data: stats } = GetStats();
  const { data: trends } = GetStatsTrends({
    queryParams: { date_from: dateFrom, date_to: dateTo },
  });

  const orderPieData = Object.entries(stats?.orders_by_status ?? {}).map(
    ([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: STATUS_COLORS[name] ?? "#94a3b8",
    }),
  );

  const dataLen = trends?.user_growth?.length ?? 0;
  const barSize = dataLen
    ? Math.max(6, Math.min(32, Math.floor(420 / dataLen)))
    : 28;
  const rangeLabel =
    dateFrom && dateTo
      ? `${format(new Date(dateFrom + "T00:00:00"), "dd MMM yyyy")} – ${format(new Date(dateTo + "T00:00:00"), "dd MMM yyyy")}`
      : "";

  const xAxisInterval = dataLen > 20 ? Math.floor(dataLen / 10) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Platform overview
        </p>
      </div>

      {/* KPI row 1 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Trainees"
          value={stats?.users !== undefined ? fmt(stats.users) : undefined}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          onClick={() => navigate("/admin/trainees")}
        />
        <StatCard
          label="Total Trainers"
          value={
            stats?.dietitians !== undefined ? fmt(stats.dietitians) : undefined
          }
          icon={<UserCheck className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          onClick={() => navigate("/admin/trainers")}
        />
        <StatCard
          label="Active Products"
          value={
            stats?.products !== undefined ? fmt(stats.products) : undefined
          }
          icon={<Package className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          onClick={() => navigate("/admin/products")}
        />
        <StatCard
          label="Total Orders"
          value={stats?.orders !== undefined ? fmt(stats.orders) : undefined}
          icon={<ShoppingBag className="h-5 w-5 text-orange-600" />}
          iconBg="bg-orange-100 dark:bg-orange-900/30"
          onClick={() => navigate("/admin/orders")}
        />
      </div>

      {/* Pending actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pending Actions</CardTitle>
          <CardDescription>Items that require your attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "User Approvals",
                count: stats?.pending_approvals ?? 0,
                icon: <UserPlus className="h-4 w-4 text-amber-600" />,
                bg: "bg-amber-50 dark:bg-amber-900/20",
                path: "/admin/users",
              },
              {
                label: "Product Requests",
                count: stats?.pending_requests ?? 0,
                icon: <Bell className="h-4 w-4 text-red-500" />,
                bg: "bg-red-50 dark:bg-red-900/20",
                path: "/admin/product-requests",
              },
              {
                label: "Trainer Assignments",
                count: stats?.pending_assignments ?? 0,
                icon: <ClipboardList className="h-4 w-4 text-blue-600" />,
                bg: "bg-blue-50 dark:bg-blue-900/20",
                path: "/admin/trainer-assignments",
              },
              {
                label: "All Orders",
                count: stats?.orders ?? 0,
                icon: <ShoppingBag className="h-4 w-4 text-orange-500" />,
                bg: "bg-orange-50 dark:bg-orange-900/20",
                path: "/admin/orders",
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 rounded-lg px-4 py-4 text-left transition-colors hover:brightness-95 ${item.bg}`}
              >
                <div className="shrink-0">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-2xl font-bold mt-0.5">{item.count}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Date range selector ── */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex flex-wrap gap-1">
              {PRESETS.filter((p) => p.key !== "custom").map((p) => (
                <Button
                  key={p.key}
                  size="sm"
                  variant={preset === p.key ? "default" : "outline"}
                  className="h-7 px-3 text-xs"
                  onClick={() => applyPreset(p.key)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <Separator orientation="vertical" className="h-5 hidden sm:block" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">From</span>
              <DatePicker
                value={dateFrom}
                onChange={handleCustomFrom}
                disabledDates={(d) =>
                  dateTo ? d > new Date(dateTo + "T00:00:00") : false
                }
                startYear={2020}
                endYear={new Date().getFullYear()}
                className="w-36"
              />
              <span className="text-xs text-muted-foreground">To</span>
              <DatePicker
                value={dateTo}
                onChange={handleCustomTo}
                disabledDates={(d) =>
                  dateFrom ? d < new Date(dateFrom + "T00:00:00") : false
                }
                startYear={2020}
                endYear={new Date().getFullYear()}
                className="w-36"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Charts row ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* User registrations over time */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">New User Registrations</CardTitle>
            <CardDescription>{rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trends?.user_growth ?? []} barSize={barSize}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={xAxisInterval}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "hsl(var(--muted))" }}
                />
                <Bar
                  dataKey="users"
                  name="Users"
                  fill="#10b981"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Users by status pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Users by Status</CardTitle>
            <CardDescription>Overall distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {(stats?.users_by_status ?? []).some((s) => s.count > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats?.users_by_status ?? []}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="45%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                  >
                    {(stats?.users_by_status ?? []).map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.status === "Active"
                            ? "#10b981"
                            : entry.status === "Pending"
                              ? "#f59e0b"
                              : "#94a3b8"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No users yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders by status + Order trend */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Orders by Status</CardTitle>
            <CardDescription>All time distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {orderPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={orderPieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {orderPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-55 items-center justify-center text-sm text-muted-foreground">
                No orders yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order & revenue trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Order &amp; Revenue Trend
            </CardTitle>
            <CardDescription>{rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trends?.order_trend ?? []}>
                <defs>
                  <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={xAxisInterval}
                />
                <YAxis
                  yAxisId="left"
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(v) => fmtCurrency(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="orders"
                  name="Orders"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#ordersGrad)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
