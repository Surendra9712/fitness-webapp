import { useState } from 'react'
import { Plus } from 'lucide-react'
import useAdmin from '@/hooks/useAdmin'
import { usePagination } from '@/hooks/usePagination'
import { AppPagination } from '@/components/ui/app-pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'
import type { ExerciseCategory } from '@/types'

const catVariant: Record<ExerciseCategory, 'warning' | 'destructive' | 'success' | 'info' | 'secondary'> = {
  cardio: 'warning', strength: 'destructive', flexibility: 'success', sports: 'info', other: 'secondary',
}
const CATEGORIES: ExerciseCategory[] = ['cardio', 'strength', 'flexibility', 'sports', 'other']

export default function ExerciseLibrary() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'cardio' as ExerciseCategory, calories_burned_per_hour: '', description: '' })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const { page, pageSize, goToPage, setPageSize } = usePagination({ initialPageSize: 20 })

  const { GetExercises, CreateExercise, DeleteExercise } = useAdmin()
  const { data, isPlaceholderData } = GetExercises({ queryParams: { page, page_size: pageSize } })
  const exercises = data?.items ?? []
  const total = data?.total ?? 0
  const createExercise = CreateExercise()
  const deleteExercise = DeleteExercise()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createExercise.mutateAsync(form)
      toast.success('Exercise added')
      setForm({ name: '', category: 'cardio', calories_burned_per_hour: '', description: '' })
      setOpen(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  function handleDeleteClick(id: number) {
    setPendingDeleteId(id)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return
    try {
      await deleteExercise.mutateAsync(pendingDeleteId)
      toast.success('Exercise deleted')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setConfirmOpen(false)
      setPendingDeleteId(null)
    }
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
                <Button type="submit" className="w-full" disabled={createExercise.isPending}>
                  {createExercise.isPending ? 'Adding…' : 'Add Exercise'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className={isPlaceholderData ? 'opacity-70' : ''}>
        <CardHeader><CardTitle>Exercises ({total})</CardTitle></CardHeader>
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
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(ex.id)}>Delete</Button>
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

      <AppPagination page={page} total={total} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={goToPage} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete exercise?"
        description="This will permanently remove the exercise from the library."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
