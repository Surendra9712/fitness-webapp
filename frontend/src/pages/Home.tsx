import { Link } from 'react-router-dom'
import {
  Leaf,
  Salad,
  Dumbbell,
  ClipboardList,
  Users,
  Shield,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getDashboardPath } from '@/lib/roles'
import PublicLayout from '@/components/PublicLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    icon: <Salad className="h-6 w-6 text-emerald-600" />,
    title: 'Personalized Diet Plans',
    description: 'Trainers create custom meal plans tailored to your goals — weight loss, maintenance, or muscle gain.',
  },
  {
    icon: <Dumbbell className="h-6 w-6 text-blue-600" />,
    title: 'Exercise Tracking',
    description: 'Log workouts and track calories burned alongside your nutrition for a complete health picture.',
  },
  {
    icon: <ClipboardList className="h-6 w-6 text-purple-600" />,
    title: 'Daily Meal Logging',
    description: 'Easily log meals from a curated library and monitor your daily calorie and macro intake.',
  },
  {
    icon: <TrendingUp className="h-6 w-6 text-orange-600" />,
    title: 'Progress Dashboard',
    description: 'Visualize your daily calories in vs out, weekly activity, and plan adherence at a glance.',
  },
]

const roles = [
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Customer',
    description: 'View your assigned nutrition plan, log meals and exercises, and track daily progress toward your goals.',
    color: 'border-emerald-200 bg-emerald-50',
  },
  {
    icon: <ClipboardList className="h-6 w-6" />,
    title: 'Trainer',
    description: 'Build diet plans, schedule meals by day, and assign personalized nutrition programs to your clients.',
    color: 'border-blue-200 bg-blue-50',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Admin',
    description: 'Manage users, maintain the meal and exercise libraries, and oversee platform-wide statistics.',
    color: 'border-purple-200 bg-purple-50',
  },
]

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-600 px-4 py-20 text-white sm:px-6 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <Leaf className="h-8 w-8 text-emerald-300" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Smart Nutrition.
            <br />
            <span className="text-emerald-300">Smarter Results.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-100">
            SmartDiet connects customers with expert trainers for personalized nutrition plans,
            meal tracking, and fitness progress — all in one platform.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {user ? (
              <Button size="lg" className="bg-white text-emerald-900 hover:bg-emerald-50" asChild>
                <Link to={getDashboardPath(user.role)}>
                  Go to Dashboard <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" className="bg-white text-emerald-900 hover:bg-emerald-50" asChild>
                  <Link to="/register">
                    Get Started Free <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need</h2>
            <p className="mt-3 text-muted-foreground">
              A complete nutrition and fitness platform built for real results.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title} className="border-0 shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    {f.icon}
                  </div>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="bg-muted/40 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Built for every role</h2>
            <p className="mt-3 text-muted-foreground">
              After signing in, you&apos;re automatically directed to your personalized dashboard.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {roles.map((r) => (
              <Card key={r.title} className={`${r.color} shadow-sm`}>
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                    {r.icon}
                  </div>
                  <CardTitle>{r.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-12 text-center text-white shadow-xl">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to transform your nutrition?</h2>
          <p className="mt-3 text-emerald-100">
            Join as a customer to follow your plan, or register as a trainer to guide others.
          </p>
          <Button size="lg" className="mt-6 bg-white text-emerald-700 hover:bg-emerald-50" asChild>
            <Link to="/register">Create Your Account</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  )
}
