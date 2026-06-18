import { useEffect, useState } from 'react'
import { Trash2, Flame } from 'lucide-react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { Exercise, ExerciseLog, ExerciseCategory } from '@/types'

const todayStr = () => new Date().toISOString().split('T')[0]

const catVariant: Record<ExerciseCategory, 'warning' | 'destructive' | 'success' | 'info' | 'secondary'> = {
  cardio: 'warning', strength: 'destructive', flexibility: 'success', sports: 'info', other: 'secondary',
}

export default function LogExercise() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [logs, setLogs] = useState<ExerciseLog[]>([])
  const [form, setForm] = useState({ exercise_id: '', logged_date: todayStr(), duration_minutes: '', notes: '' })
  const [date, setDate] = useState(todayStr())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadLogs = (d: string) => api.get<ExerciseLog[]>(`/user/exercise-logs?date=${d}`).then(setLogs).catch(e => setError((e as Error).message))

  useEffect(() => {
    api.get<Exercise[]>('/user/exercises').then(setExercises).catch(e => setError((e as Error).message))
    loadLogs(todayStr())
  }, [])

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('')
    try {
      const res = await api.post<{ calories_burned: number }>('/user/exercise-logs', form)
      setSuccess(`Exercise logged! Burned ~${res.calories_burned} kcal`)
      setForm(f => ({ ...f, exercise_id: '', duration_minutes: '', notes: '' }))
      loadLogs(date)
    } catch (err) { setError((err as Error).message) }
  }

  const deleteLog = async (id: number) => {
    try { await api.delete(`/user/exercise-logs/${id}`); loadLogs(date) }
    catch (err) { setError((err as Error).message) }
  }

  const handleDateChange = (d: string) => { setDate(d); loadLogs(d) }

  const selectedEx = exercises.find(e => String(e.id) === form.exercise_id)
  const estCal = selectedEx && form.duration_minutes
    ? Math.round(selectedEx.calories_burned_per_hour * Number(form.duration_minutes) / 60) : null

  const dayTotal = logs.reduce((s, l) => s + (l.calories_burned ?? 0), 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Log Exercise</h1>
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
              <Label>Duration (minutes)</Label>
              <Input type="number" min={1} placeholder="30" value={form.duration_minutes} onChange={e => setForm(f => ({...f, duration_minutes: e.target.value}))} required />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Exercise</Label>
              <Select value={form.exercise_id} onValueChange={v => setForm(f => ({...f, exercise_id: v}))}>
                <SelectTrigger><SelectValue placeholder="Choose an exercise…" /></SelectTrigger>
                <SelectContent>
                  {exercises.map(ex => (
                    <SelectItem key={ex.id} value={String(ex.id)}>
                      {ex.name} ({ex.category}) — {ex.calories_burned_per_hour} kcal/hr
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {estCal !== null && (
              <div className="col-span-2">
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700 font-medium">
                  <Flame className="h-4 w-4" />Estimated burn: ~{estCal} kcal
                </div>
              </div>
            )}
            <div className="col-span-2 space-y-2">
              <Label>Notes (optional)</Label>
              <Input placeholder="e.g. felt strong today" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
            </div>
            <div className="col-span-2">
              <Button type="submit" className="w-full sm:w-auto">Log Exercise</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Exercise Log</CardTitle>
          <div className="flex items-center gap-3">
            <Input type="date" value={date} onChange={e => handleDateChange(e.target.value)} className="w-auto" />
            <Badge variant="secondary">{dayTotal} kcal burned</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Exercise</TableHead><TableHead>Category</TableHead><TableHead>Duration</TableHead><TableHead>Burned</TableHead><TableHead>Notes</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.exercise_name}</TableCell>
                  <TableCell><Badge variant={catVariant[l.category as ExerciseCategory]} className="capitalize">{l.category}</Badge></TableCell>
                  <TableCell>{l.duration_minutes} min</TableCell>
                  <TableCell>{l.calories_burned} kcal</TableCell>
                  <TableCell className="text-muted-foreground">{l.notes ?? '—'}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteLog(l.id)}><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!logs.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No exercises logged for {date}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
