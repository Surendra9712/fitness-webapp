import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Zap, TrendingDown, Clock, Salad, Dumbbell, ClipboardList } from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { DashboardStats, ActivePlan } from '@/types'

const today = new Date().toISOString().split('T')[0]

export default function UserDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [plan, setPlan] = useState<ActivePlan | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<DashboardStats>(`/user/dashboard?date=${today}`).then(setStats).catch(e => setError((e as Error).message))
    api.get<{ plan: ActivePlan | null }>('/user/my-plan').then(d => setPlan(d.plan)).catch(() => {})
  }, [])

  const calTarget = plan?.total_daily_calories ?? 2000
  const pct = stats ? Math.min(100, Math.round((stats.calories_in / calTarget) * 100)) : 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Calories In', value: stats.calories_in, icon: <Flame className="h-4 w-4 text-orange-500" />, sub: 'kcal consumed' },
            { label: 'Calories Burned', value: stats.calories_out, icon: <Zap className="h-4 w-4 text-yellow-500" />, sub: 'kcal burned' },
            { label: 'Net Calories', value: stats.net_calories, icon: <TrendingDown className="h-4 w-4 text-blue-500" />, sub: 'kcal net' },
            { label: 'Exercise This Week', value: `${stats.exercise_mins_this_week}m`, icon: <Clock className="h-4 w-4 text-emerald-500" />, sub: 'minutes active' },
          ].map(s => (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
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

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Calorie Goal <span className="text-sm font-normal text-muted-foreground">({today})</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={pct} className="h-3" />
            <p className="text-sm text-muted-foreground">{stats.calories_in} / {calTarget} kcal &mdash; {pct}% of goal</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { to: '/user/log-meal', icon: <Salad className="h-8 w-8 text-emerald-500" />, label: 'Log Meal' },
          { to: '/user/log-exercise', icon: <Dumbbell className="h-8 w-8 text-blue-500" />, label: 'Log Exercise' },
          { to: '/user/my-plan', icon: <ClipboardList className="h-8 w-8 text-purple-500" />, label: 'View Plan' },
        ].map(q => (
          <Link key={q.to} to={q.to} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-6 text-sm font-medium shadow-sm transition-colors hover:border-primary hover:bg-primary/5">
            {q.icon}{q.label}
          </Link>
        ))}
      </div>

      {plan ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="font-semibold">{plan.title}</div>
            {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline" className="capitalize">{plan.goal?.replace('_', ' ')}</Badge>
              {plan.total_daily_calories && <Badge variant="secondary">{plan.total_daily_calories} kcal/day</Badge>}
              <Badge variant="outline">By {plan.dietitian_name}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{plan.start_date} → {plan.end_date ?? 'ongoing'}</p>
          </CardContent>
        </Card>
      ) : (
        <Alert variant="info"><AlertDescription>No diet plan assigned yet. Contact your dietitian.</AlertDescription></Alert>
      )}
    </div>
  )
}
