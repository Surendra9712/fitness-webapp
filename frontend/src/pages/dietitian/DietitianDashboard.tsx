import { Users, Bell } from 'lucide-react'
import useDietitian from '@/hooks/useDietitian'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function DietitianDashboard() {
  const { GetClients, GetStats } = useDietitian()
  const { data: clientsData } = GetClients({ queryParams: { page_size: 50 } })
  const clients = clientsData?.items ?? []
  const { data: stats = { customers: 0, pending_requests: 0 } } = GetStats()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Trainer Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.customers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
            <Bell className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pending_requests}</div>
            {stats.pending_requests > 0 && (
              <p className="text-xs text-yellow-600 mt-1">Review in Assignments</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>My Clients</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                </TableRow>
              ))}
              {!clients.length && (
                <TableRow>
                  <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">No assigned clients yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
