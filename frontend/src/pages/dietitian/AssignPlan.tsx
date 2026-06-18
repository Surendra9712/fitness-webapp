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
import type { DietPlan, Assignment, User } from '@/types'

const todayStr = () => new Date().toISOString().split('T')[0]

export default function AssignPlan() {
  const [users, setUsers] = useState<User[]>([])
  const [plans, setPlans] = useState<DietPlan[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [form, setForm] = useState({ user_id: '', plan_id: '', start_date: todayStr(), end_date: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadAssignments = () => api.get<Assignment[]>('/dietitian/assignments').then(setAssignments).catch(e => setError((e as Error).message))

  useEffect(() => {
    api.get<User[]>('/dietitian/users').then(setUsers).catch(e => setError((e as Error).message))
    api.get<DietPlan[]>('/dietitian/plans').then(setPlans).catch(e => setError((e as Error).message))
    loadAssignments()
  }, [])

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('')
    try {
      await api.post('/dietitian/assignments', form)
      setSuccess('Plan assigned successfully')
      setForm({ user_id: '', plan_id: '', start_date: todayStr(), end_date: '' })
      loadAssignments()
    } catch (err) { setError((err as Error).message) }
  }

  const removeAssignment = async (id: number) => {
    if (!confirm('Remove this assignment?')) return
    try { await api.delete(`/dietitian/assignments/${id}`); loadAssignments() }
    catch (err) { setError((err as Error).message) }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Assign Diet Plans</h1>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert variant="success"><AlertDescription>{success}</AlertDescription></Alert>}

      <Card>
        <CardHeader><CardTitle>New Assignment</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleAssign} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={form.user_id} onValueChange={v => setForm(f => ({...f, user_id: v}))}>
                <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Diet Plan</Label>
              <Select value={form.plan_id} onValueChange={v => setForm(f => ({...f, plan_id: v}))}>
                <SelectTrigger><SelectValue placeholder="Select plan…" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} required />
            </div>
            <div className="space-y-2">
              <Label>End Date (optional)</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" className="w-full sm:w-auto">Assign Plan</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Current Assignments ({assignments.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead><TableHead>Plan</TableHead>
                <TableHead>Start</TableHead><TableHead>End</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map(a => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">{a.user_name}</div>
                    <div className="text-xs text-muted-foreground">{a.user_email}</div>
                  </TableCell>
                  <TableCell className="font-medium">{a.plan_title}</TableCell>
                  <TableCell className="text-muted-foreground">{a.start_date}</TableCell>
                  <TableCell className="text-muted-foreground">{a.end_date ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="destructive" onClick={() => removeAssignment(a.id)}>
                      <Trash2 className="h-3 w-3" />Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!assignments.length && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No assignments yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
