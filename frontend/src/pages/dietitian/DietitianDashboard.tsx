import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Users, UserCheck, ArrowRight } from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { DietPlan, Assignment } from '@/types'

export default function DietitianDashboard() {
  const [plans, setPlans] = useState<DietPlan[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<DietPlan[]>('/dietitian/plans').then(setPlans).catch(e => setError((e as Error).message))
    api.get<Assignment[]>('/dietitian/assignments').then(setAssignments).catch(e => setError((e as Error).message))
  }, [])

  const clients = new Set(assignments.map(a => a.user_id)).size

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dietitian Dashboard</h1>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'My Plans', value: plans.length, icon: <ClipboardList className="h-4 w-4 text-emerald-600" /> },
          { label: 'Assignments', value: assignments.length, icon: <UserCheck className="h-4 w-4 text-blue-600" /> },
          { label: 'Clients', value: clients, icon: <Users className="h-4 w-4 text-purple-600" /> },
        ].map(s => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              {s.icon}
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Plans</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dietitian/plans"><ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Goal</TableHead><TableHead>Cal/day</TableHead></TableRow></TableHeader>
              <TableBody>
                {plans.slice(0, 5).map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{p.goal?.replace('_', ' ')}</TableCell>
                    <TableCell className="text-muted-foreground">{p.total_daily_calories ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {!plans.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No plans yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Assignments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dietitian/assign"><ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Plan</TableHead><TableHead>Start</TableHead></TableRow></TableHeader>
              <TableBody>
                {assignments.slice(0, 5).map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.user_name}</TableCell>
                    <TableCell className="text-muted-foreground">{a.plan_title}</TableCell>
                    <TableCell className="text-muted-foreground">{a.start_date}</TableCell>
                  </TableRow>
                ))}
                {!assignments.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No assignments yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
