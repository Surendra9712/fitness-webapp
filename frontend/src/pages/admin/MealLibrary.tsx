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
import type { Meal, MealCategory } from '@/types'

const catVariant: Record<MealCategory, 'warning' | 'success' | 'info' | 'purple'> = {
  breakfast: 'warning', lunch: 'info', dinner: 'success', snack: 'purple',
}
const CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack']

const emptyMeal = { name: '', description: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', category: 'breakfast' as MealCategory }

export default function MealLibrary() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyMeal)
  const [filter, setFilter] = useState<MealCategory | 'all'>('all')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = () => api.get<Meal[]>('/admin/meals').then(setMeals).catch(e => setError((e as Error).message))
  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('')
    try {
      await api.post('/admin/meals', form)
      setSuccess('Meal added'); setForm(emptyMeal); setOpen(false); load()
    } catch (err) { setError((err as Error).message) }
  }

  const deleteMeal = async (id: number) => {
    if (!confirm('Remove this meal?')) return
    try { await api.delete(`/admin/meals/${id}`); load() }
    catch (err) { setError((err as Error).message) }
  }

  const filtered = filter === 'all' ? meals : meals.filter(m => m.category === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Meal Library</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Add Meal</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Meal</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4 pt-2">
              <div className="col-span-2 space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v as MealCategory}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Calories</Label>
                <Input type="number" min={0} value={form.calories} onChange={e => setForm(f => ({...f, calories: e.target.value}))} required />
              </div>
              <div className="space-y-2">
                <Label>Protein (g)</Label>
                <Input type="number" min={0} step="0.1" value={form.protein_g} onChange={e => setForm(f => ({...f, protein_g: e.target.value}))} />
              </div>
              <div className="space-y-2">
                <Label>Carbs (g)</Label>
                <Input type="number" min={0} step="0.1" value={form.carbs_g} onChange={e => setForm(f => ({...f, carbs_g: e.target.value}))} />
              </div>
              <div className="space-y-2">
                <Label>Fat (g)</Label>
                <Input type="number" min={0} step="0.1" value={form.fat_g} onChange={e => setForm(f => ({...f, fat_g: e.target.value}))} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
              </div>
              <div className="col-span-2">
                <Button type="submit" className="w-full">Add Meal</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert variant="success"><AlertDescription>{success}</AlertDescription></Alert>}

      <div className="flex gap-2 flex-wrap">
        {(['all', ...CATEGORIES] as const).map(c => (
          <Button key={c} size="sm" variant={filter === c ? 'default' : 'outline'} onClick={() => setFilter(c)} className="capitalize">
            {c}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Meals ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Category</TableHead>
                <TableHead>Cal</TableHead><TableHead>Protein</TableHead>
                <TableHead>Carbs</TableHead><TableHead>Fat</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium">{m.name}</div>
                    {m.description && <div className="text-xs text-muted-foreground">{m.description}</div>}
                  </TableCell>
                  <TableCell><Badge variant={catVariant[m.category]} className="capitalize">{m.category}</Badge></TableCell>
                  <TableCell>{m.calories}</TableCell>
                  <TableCell>{m.protein_g}g</TableCell>
                  <TableCell>{m.carbs_g}g</TableCell>
                  <TableCell>{m.fat_g}g</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="destructive" onClick={() => deleteMeal(m.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No meals found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
