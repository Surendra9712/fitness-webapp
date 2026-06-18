import { Link } from 'react-router-dom'
import { Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-emerald-600" />
            <span className="text-lg font-bold tracking-tight text-emerald-900">SmartDiet</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-emerald-950 py-8 text-emerald-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold text-white">SmartDiet</span>
            </div>
            <p className="text-sm text-emerald-300">
              Smart nutrition planning for customers, trainers, and admins.
            </p>
            <p className="text-xs text-emerald-400">&copy; {new Date().getFullYear()} SmartDiet</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
