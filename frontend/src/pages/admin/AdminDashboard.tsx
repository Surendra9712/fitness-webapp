import { useEffect, useState } from 'react'
import { Users, UserCheck, BookOpen, Salad, TrendingUp } from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AdminStats, Role } from '@/types'

const roleBadge: Record<Role, 'destructive' | 'info' | 'success'> = {
  admin: 'destructive', dietitian: 'info', user: 'success',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<AdminStats>('/admin/stats').then(setStats).catch(e => setError((e as Error).message))
  }, [])

  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Members', value: stats?.users, icon: <Users className="h-4 w-4" />, color: 'text-blue-600' },
          { label: 'Dietitians', value: stats?.dietitians, icon: <UserCheck className="h-4 w-4" />, color: 'text-purple-600' },
          { label: 'Diet Plans', value: stats?.diet_plans, icon: <BookOpen className="h-4 w-4" />, color: 'text-emerald-600' },
          { label: 'Meals in Library', value: stats?.meals, icon: <Salad className="h-4 w-4" />, color: 'text-orange-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <span className={s.color}>{s.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats ? s.value : '—'}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Recently Joined</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.recent_users.map((u, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell><Badge variant={roleBadge[u.role]} className="capitalize">{u.role}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{new Date(u.created_at!).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {!stats?.recent_users.length && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No users yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
