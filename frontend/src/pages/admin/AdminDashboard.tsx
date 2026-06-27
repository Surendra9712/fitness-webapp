import { useNavigate } from 'react-router-dom'
import {
  Users, UserCheck, Package, ShoppingBag, Bell,
  ClipboardList, TrendingUp, DollarSign, UserPlus, ArrowRight,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import useAdmin from '@/hooks/useAdmin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ROLE_LABELS } from '@/lib/roles'
import type { Role } from '@/types'

const roleBadge: Record<Role, 'destructive' | 'info' | 'success'> = {
  admin: 'destructive', dietitian: 'info', trainee: 'success',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444',
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

const fmtCurrency = (n: number) =>
  `Rs. ${fmt(n)}`

interface StatCardProps {
  label: string
  value: string | number | undefined
  icon: React.ReactNode
  iconBg: string
  sub?: string
  alert?: boolean
  onClick?: () => void
}

function StatCard({ label, value, icon, iconBg, sub, alert, onClick }: StatCardProps) {
  return (
    <Card
      className={`transition-shadow hover:shadow-md ${onClick ? 'cursor-pointer' : ''} ${alert && Number(value) > 0 ? 'border-amber-400/60' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-bold tracking-tight">
              {value !== undefined ? value : '—'}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">
            {p.name === 'Revenue' ? fmtCurrency(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { GetStats } = useAdmin()
  const { data: stats } = GetStats()

  const orderPieData = Object.entries(stats?.orders_by_status ?? {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: STATUS_COLORS[name] ?? '#94a3b8',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform overview</p>
      </div>

      {/* Primary KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Trainees"
          value={stats?.users !== undefined ? fmt(stats.users) : undefined}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          onClick={() => navigate('/admin/trainees')}
        />
        <StatCard
          label="Total Trainers"
          value={stats?.dietitians !== undefined ? fmt(stats.dietitians) : undefined}
          icon={<UserCheck className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          onClick={() => navigate('/admin/trainers')}
        />
        <StatCard
          label="Active Products"
          value={stats?.products !== undefined ? fmt(stats.products) : undefined}
          icon={<Package className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          onClick={() => navigate('/admin/products')}
        />
        <StatCard
          label="Total Orders"
          value={stats?.orders !== undefined ? fmt(stats.orders) : undefined}
          icon={<ShoppingBag className="h-5 w-5 text-orange-600" />}
          iconBg="bg-orange-100 dark:bg-orange-900/30"
          onClick={() => navigate('/admin/orders')}
        />
      </div>

      {/* Revenue + Pending row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={stats ? fmtCurrency(stats.total_revenue ?? 0) : undefined}
          icon={<DollarSign className="h-5 w-5 text-teal-600" />}
          iconBg="bg-teal-100 dark:bg-teal-900/30"
          sub="All time"
        />
        <StatCard
          label="Revenue (30d)"
          value={stats ? fmtCurrency(stats.revenue_30d ?? 0) : undefined}
          icon={<TrendingUp className="h-5 w-5 text-teal-500" />}
          iconBg="bg-teal-100 dark:bg-teal-900/30"
          sub="Last 30 days"
        />
        <StatCard
          label="Pending Approvals"
          value={stats?.pending_approvals !== undefined ? stats.pending_approvals : undefined}
          icon={<UserPlus className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          sub="New registrations"
          alert
          onClick={() => navigate('/admin/users')}
        />
        <StatCard
          label="Pending Requests"
          value={stats?.pending_requests !== undefined ? stats.pending_requests : undefined}
          icon={<Bell className="h-5 w-5 text-red-500" />}
          iconBg="bg-red-100 dark:bg-red-900/30"
          sub="Product requests"
          alert
          onClick={() => navigate('/admin/product-requests')}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">New User Registrations</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats?.user_growth ?? []} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="users" name="Users" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No orders yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order trend area chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Order &amp; Revenue Trend</CardTitle>
          <CardDescription>Last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats?.order_trend ?? []}>
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
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={28} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={64} tickFormatter={v => fmtCurrency(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Area yAxisId="left" type="monotone" dataKey="orders" name="Orders" stroke="#6366f1" strokeWidth={2} fill="url(#ordersGrad)" />
              <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bottom row: recent users + pending actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Recent Users</CardTitle>
              <CardDescription>Latest registrations</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/admin/users')}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {(stats?.recent_users ?? []).map((u: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-6 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={roleBadge[u.role as Role]}>{ROLE_LABELS[u.role as Role]}</Badge>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              {!stats?.recent_users?.length && (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">No users yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pending Actions</CardTitle>
            <CardDescription>Requires your attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              {
                label: 'User Approvals',
                count: stats?.pending_approvals ?? 0,
                icon: <UserPlus className="h-4 w-4 text-amber-600" />,
                path: '/admin/users',
              },
              {
                label: 'Product Requests',
                count: stats?.pending_requests ?? 0,
                icon: <Bell className="h-4 w-4 text-red-500" />,
                path: '/admin/product-requests',
              },
              {
                label: 'Trainer Assignments',
                count: stats?.pending_assignments ?? 0,
                icon: <ClipboardList className="h-4 w-4 text-blue-600" />,
                path: '/admin/trainer-assignments',
              },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted"
              >
                <div className="shrink-0">{item.icon}</div>
                <span className="flex-1 text-sm font-medium text-left">{item.label}</span>
                <Badge variant={item.count > 0 ? 'warning' : 'secondary'} className="shrink-0">
                  {item.count}
                </Badge>
              </button>
            ))}

            <Separator className="my-1" />

            <button
              onClick={() => navigate('/admin/orders')}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted"
            >
              <ShoppingBag className="h-4 w-4 text-orange-500 shrink-0" />
              <span className="flex-1 text-sm font-medium text-left">All Orders</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
