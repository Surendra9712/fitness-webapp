import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { DietPlan, Meal, MealCategory, Goal } from '@/types'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const
const TIMES: MealCategory[] = ['breakfast','lunch','dinner','snack']
const GOALS: Goal[] = ['lose_weight', 'maintain', 'gain_muscle']

export default function DietPlans() {
  const [plans, setPlans] = useState<DietPlan[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [selectedPlan, setSelectedPlan] = useState<DietPlan | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', goal: 'maintain' as Goal, total_daily_calories: '' })
  const [mealForm, setMealForm] = useState({ meal_id: '', day_of_week: 'monday', meal_time: 'breakfast' as MealCategory })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadPlans = () => api.get<DietPlan[]>('/dietitian/plans').then(setPlans).catch(e => setError((e as Error).message))
  const loadMeals = () => api.get<Meal[]>('/admin/meals').then(setMeals).catch(() => {})

  useEffect(() => { loadPlans(); loadMeals() }, [])

  const loadDetail = (id: number) =>
    api.get<DietPlan>(`/dietitian/plans/${id}`).then(setSelectedPlan).catch(e => setError((e as Error).message))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('')
    try {
      await api.post('/dietitian/plans', form)
      setSuccess('Plan created'); setOpen(false); setForm({ title: '', description: '', goal: 'maintain', total_daily_calories: '' }); loadPlans()
    } catch (err) { setError((err as Error).message) }
  }

  const deletePlan = async (id: number) => {
    if (!confirm('Delete this plan?')) return
    try {
      await api.delete(`/dietitian/plans/${id}`)
      loadPlans()
      if (selectedPlan?.id === id) setSelectedPlan(null)
    } catch (err) { setError((err as Error).message) }
  }

  const addMeal = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!selectedPlan) return
    try {
      await api.post(`/dietitian/plans/${selectedPlan.id}/meals`, mealForm)
      loadDetail(selectedPlan.id)
    } catch (err) { setError((err as Error).message) }
  }

  const removeMeal = async (entryId: number) => {
    if (!selectedPlan) return
    try { await api.delete(`/dietitian/plans/${selectedPlan.id}/meals/${entryId}`); loadDetail(selectedPlan.id) }
    catch (err) { setError((err as Error).message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Diet Plans</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" />New Plan</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Diet Plan</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Goal</Label>
                  <Select value={form.goal} onValueChange={v => setForm(f => ({...f, goal: v as Goal}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GOALS.map(g => <SelectItem key={g} value={g} className="capitalize">{g.replace('_',' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Daily Calories</Label><Input type="number" min={0} value={form.total_daily_calories} onChange={e => setForm(f => ({...f, total_daily_calories: e.target.value}))} /></div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
              <Button type="submit" className="w-full">Create Plan</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert variant="success"><AlertDescription>{success}</AlertDescription></Alert>}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Plan list */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">My Plans</p>
          {plans.map(p => (
            <div
              key={p.id}
              onClick={() => loadDetail(p.id)}
              className={`group relative cursor-pointer rounded-lg border p-3 transition-colors ${selectedPlan?.id === p.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
            >
              <div className="pr-8 font-medium">{p.title}</div>
              <div className="mt-1 flex gap-2">
                <Badge variant="outline" className="capitalize text-xs">{p.goal?.replace('_',' ')}</Badge>
                {p.total_daily_calories && <Badge variant="secondary" className="text-xs">{p.total_daily_calories} kcal</Badge>}
              </div>
              <Button size="icon" variant="ghost"
                className="absolute right-1 top-1 h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                onClick={e => { e.stopPropagation(); deletePlan(p.id) }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {!plans.length && <p className="text-sm text-muted-foreground px-1">No plans yet</p>}
        </div>

        {/* Plan detail */}
        <Card>
          {selectedPlan ? (
            <>
              <CardHeader>
                <CardTitle>{selectedPlan.title}</CardTitle>
                {selectedPlan.description && <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>}
              </CardHeader>
              <CardContent className="space-y-4">
                <Separator />
                <p className="text-sm font-medium">Add meal to plan</p>
                <form onSubmit={addMeal} className="flex flex-wrap gap-2">
                  <Select value={mealForm.meal_id} onValueChange={v => setMealForm(f => ({...f, meal_id: v}))}>
                    <SelectTrigger className="min-w-[200px] flex-1"><SelectValue placeholder="Select meal…" /></SelectTrigger>
                    <SelectContent>
                      {meals.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.calories} kcal)</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={mealForm.day_of_week} onValueChange={v => setMealForm(f => ({...f, day_of_week: v}))}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={mealForm.meal_time} onValueChange={v => setMealForm(f => ({...f, meal_time: v as MealCategory}))}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="submit" size="sm">Add</Button>
                </form>
                <Separator />
                <Table>
                  <TableHeader><TableRow><TableHead>Day</TableHead><TableHead>Time</TableHead><TableHead>Meal</TableHead><TableHead>Cal</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {selectedPlan.meals?.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="capitalize">{m.day_of_week}</TableCell>
                        <TableCell className="capitalize">{m.meal_time}</TableCell>
                        <TableCell className="font-medium">{m.meal_name}</TableCell>
                        <TableCell>{m.calories}</TableCell>
                        <TableCell><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeMeal(m.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {!selectedPlan.meals?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No meals added yet</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
              Select a plan to view and edit its meals
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
