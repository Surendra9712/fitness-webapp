import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { Meal, MealLog, MealCategory } from '@/types'

const todayStr = () => new Date().toISOString().split('T')[0]
const TIMES: MealCategory[] = ['breakfast','lunch','dinner','snack']
const CATEGORIES = ['all','breakfast','lunch','dinner','snack'] as const

export default function LogMeal() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [logs, setLogs] = useState<MealLog[]>([])
  const [form, setForm] = useState({ meal_id: '', logged_date: todayStr(), meal_time: 'breakfast' as MealCategory, notes: '' })
  const [date, setDate] = useState(todayStr())
  const [filter, setFilter] = useState<typeof CATEGORIES[number]>('all')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadLogs = (d: string) => api.get<MealLog[]>(`/user/meal-logs?date=${d}`).then(setLogs).catch(e => setError((e as Error).message))

  useEffect(() => {
    api.get<Meal[]>('/user/meals').then(setMeals).catch(e => setError((e as Error).message))
    loadLogs(todayStr())
  }, [])

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('')
    try {
      await api.post('/user/meal-logs', form)
      setSuccess('Meal logged!')
      setForm(f => ({ ...f, meal_id: '', notes: '' }))
      loadLogs(date)
    } catch (err) { setError((err as Error).message) }
  }

  const deleteLog = async (id: number) => {
    try { await api.delete(`/user/meal-logs/${id}`); loadLogs(date) }
    catch (err) { setError((err as Error).message) }
  }

  const handleDateChange = (d: string) => { setDate(d); loadLogs(d) }
  const filtered = filter === 'all' ? meals : meals.filter(m => m.category === filter)
  const dayTotal = logs.reduce((s, l) => s + l.calories, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Log Meal</h1>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert variant="success"><AlertDescription>{success}</AlertDescription></Alert>}

      <Card>
        <CardHeader><CardTitle>Add Entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleLog} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.logged_date} onChange={e => setForm(f => ({...f, logged_date: e.target.value}))} required />
            </div>
            <div className="space-y-2">
              <Label>Meal Time</Label>
              <Select value={form.meal_time} onValueChange={v => setForm(f => ({...f, meal_time: v as MealCategory}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Filter by category</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <Button key={c} type="button" size="sm" variant={filter === c ? 'default' : 'outline'} className="capitalize" onClick={() => setFilter(c)}>{c}</Button>
                ))}
              </div>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Select Meal</Label>
              <Select value={form.meal_id} onValueChange={v => setForm(f => ({...f, meal_id: v}))}>
                <SelectTrigger><SelectValue placeholder="Choose a meal…" /></SelectTrigger>
                <SelectContent>
                  {filtered.map(m => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name} — {m.calories} kcal (P:{m.protein_g}g C:{m.carbs_g}g F:{m.fat_g}g)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes (optional)</Label>
              <Input placeholder="e.g. extra portion" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
            </div>
            <div className="col-span-2">
              <Button type="submit" className="w-full sm:w-auto">Log Meal</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Meal Log</CardTitle>
          <div className="flex items-center gap-3">
            <Input type="date" value={date} onChange={e => handleDateChange(e.target.value)} className="w-auto" />
            <Badge variant="secondary">{dayTotal} kcal total</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Meal</TableHead><TableHead>Time</TableHead><TableHead>Cal</TableHead><TableHead>P</TableHead><TableHead>C</TableHead><TableHead>F</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {logs.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.meal_name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{l.meal_time}</TableCell>
                  <TableCell>{l.calories}</TableCell>
                  <TableCell className="text-muted-foreground">{l.protein_g}g</TableCell>
                  <TableCell className="text-muted-foreground">{l.carbs_g}g</TableCell>
                  <TableCell className="text-muted-foreground">{l.fat_g}g</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteLog(l.id)}><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!logs.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No meals logged for {date}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
