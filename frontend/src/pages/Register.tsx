import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await register(form.name, form.email, form.password, form.role)
      navigate(user.role === 'dietitian' ? '/dietitian' : '/user')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-900 to-emerald-600 p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Leaf className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join SmartDiet today</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Jane Doe" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Min 6 characters" minLength={6} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>I am a…</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Member / User</SelectItem>
                  <SelectItem value="dietitian">Dietitian</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Creating…' : 'Create Account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
