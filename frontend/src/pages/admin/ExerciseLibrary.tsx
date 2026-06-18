import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { Exercise, ExerciseCategory } from '@/types'

const catVariant: Record<ExerciseCategory, 'warning' | 'destructive' | 'success' | 'info' | 'secondary'> = {
  cardio: 'warning', strength: 'destructive', flexibility: 'success', sports: 'info', other: 'secondary',
}
const CATEGORIES: ExerciseCategory[] = ['cardio', 'strength', 'flexibility', 'sports', 'other']

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'cardio' as ExerciseCategory, calories_burned_per_hour: '', description: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = () => api.get<Exercise[]>('/admin/exercises').then(setExercises).catch(e => setError((e as Error).message))
  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('')
    try {
      await api.post('/admin/exercises', form)
      setSuccess('Exercise added'); setForm({ name: '', category: 'cardio', calories_burned_per_hour: '', description: '' }); setOpen(false); load()
    } catch (err) { setError((err as Error).message) }
  }

  const deleteEx = async (id: number) => {
    if (!confirm('Delete this exercise?')) return
    try { await api.delete(`/admin/exercises/${id}`); load() }
    catch (err) { setError((err as Error).message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Exercise Library</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Add Exercise</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Exercise</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4 pt-2">
              <div className="col-span-2 space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v as ExerciseCategory}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Calories/hr</Label>
                <Input type="number" min={0} value={form.calories_burned_per_hour} onChange={e => setForm(f => ({...f, calories_burned_per_hour: e.target.value}))} required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
              </div>
              <div className="col-span-2">
                <Button type="submit" className="w-full">Add Exercise</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert variant="success"><AlertDescription>{success}</AlertDescription></Alert>}

      <Card>
        <CardHeader><CardTitle>Exercises ({exercises.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Category</TableHead>
                <TableHead>Cal/hr</TableHead><TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exercises.map(ex => (
                <TableRow key={ex.id}>
                  <TableCell className="font-medium">{ex.name}</TableCell>
                  <TableCell><Badge variant={catVariant[ex.category]} className="capitalize">{ex.category}</Badge></TableCell>
                  <TableCell>{ex.calories_burned_per_hour}</TableCell>
                  <TableCell className="text-muted-foreground">{ex.description || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="destructive" onClick={() => deleteEx(ex.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!exercises.length && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No exercises found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
