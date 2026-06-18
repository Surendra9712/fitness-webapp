import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ActivePlan, DietPlanMeal, MealCategory } from '@/types'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const
const TIMES: MealCategory[] = ['breakfast','lunch','dinner','snack']

export default function MyDietPlan() {
  const [plan, setPlan] = useState<ActivePlan | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<{ plan: ActivePlan | null }>('/user/my-plan').then(d => setPlan(d.plan)).catch(e => setError((e as Error).message))
  }, [])

  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
  if (!plan) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Diet Plan</h1>
      <Alert variant="info"><AlertDescription>No diet plan assigned yet. Your trainer will assign one.</AlertDescription></Alert>
    </div>
  )

  const mealsForDay = (day: string) => (plan.meals ?? []).filter(m => m.day_of_week === day)
  const dayCalories = (day: string) => mealsForDay(day).reduce((s, m) => s + m.calories, 0)
  const groupByTime = (meals: DietPlanMeal[]) =>
    TIMES.reduce<Record<MealCategory, DietPlanMeal[]>>((acc, t) => ({ ...acc, [t]: meals.filter(m => m.meal_time === t) }), {} as Record<MealCategory, DietPlanMeal[]>)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Diet Plan</h1>

      <Card>
        <CardHeader>
          <CardTitle>{plan.title}</CardTitle>
          {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">{plan.goal?.replace('_',' ')}</Badge>
            {plan.total_daily_calories && <Badge variant="secondary">{plan.total_daily_calories} kcal/day target</Badge>}
            <Badge variant="outline">Trainer: {plan.dietitian_name}</Badge>
            <Badge variant="secondary">{plan.start_date} → {plan.end_date ?? 'ongoing'}</Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="monday">
        <TabsList className="flex h-auto flex-wrap gap-1 bg-muted p-1">
          {DAYS.map(d => (
            <TabsTrigger key={d} value={d} className="capitalize text-xs">
              {d.slice(0, 3).toUpperCase()}
              <span className="ml-1 text-muted-foreground">({dayCalories(d)} kcal)</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {DAYS.map(d => {
          const grouped = groupByTime(mealsForDay(d))
          return (
            <TabsContent key={d} value={d} className="space-y-3 mt-4">
              {TIMES.map(time => (
                <Card key={time}>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm capitalize text-muted-foreground">{time}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0 space-y-2">
                    {grouped[time].length === 0 ? (
                      <p className="text-sm text-muted-foreground">No meals scheduled</p>
                    ) : grouped[time].map(m => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                        <div>
                          <div className="font-medium text-sm">{m.meal_name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            P: {m.protein_g}g · C: {m.carbs_g}g · F: {m.fat_g}g
                          </div>
                        </div>
                        <Badge variant="secondary">{m.calories} kcal</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
