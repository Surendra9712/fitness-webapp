import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS, getDashboardPath } from '@/lib/roles'
import {
  LayoutDashboard, Users, Salad, Dumbbell,
  ClipboardList, UserCheck, LogOut, Leaf, User,
} from 'lucide-react'
import type { Role } from '@/types'

interface NavItem { to: string; label: string; icon: React.ReactNode }

const navLinks: Record<Role, NavItem[]> = {
  admin: [
    { to: '/admin',            label: 'Dashboard',  icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: '/admin/users',      label: 'Users',       icon: <Users className="h-4 w-4" /> },
    { to: '/admin/meals',      label: 'Meals',       icon: <Salad className="h-4 w-4" /> },
    { to: '/admin/exercises',  label: 'Exercises',   icon: <Dumbbell className="h-4 w-4" /> },
    { to: '/trainer',          label: 'Trainer Hub', icon: <ClipboardList className="h-4 w-4" /> },
    { to: '/trainer/plans',    label: 'Diet Plans',  icon: <ClipboardList className="h-4 w-4" /> },
    { to: '/trainer/assign',   label: 'Assign Plans', icon: <UserCheck className="h-4 w-4" /> },
  ],
  dietitian: [
    { to: '/trainer',        label: 'Dashboard',  icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: '/trainer/plans',  label: 'Diet Plans', icon: <ClipboardList className="h-4 w-4" /> },
    { to: '/trainer/assign', label: 'Assign',     icon: <UserCheck className="h-4 w-4" /> },
  ],
  user: [
    { to: '/customer',              label: 'Dashboard',    icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: '/customer/my-plan',      label: 'My Plan',      icon: <ClipboardList className="h-4 w-4" /> },
    { to: '/customer/log-meal',     label: 'Log Meal',     icon: <Salad className="h-4 w-4" /> },
    { to: '/customer/log-exercise', label: 'Log Exercise', icon: <Dumbbell className="h-4 w-4" /> },
    { to: '/customer/profile',      label: 'Profile',      icon: <User className="h-4 w-4" /> },
  ],
}

const roleBadge: Record<Role, 'success' | 'destructive' | 'info'> = {
  admin: 'destructive',
  dietitian: 'info',
  user: 'success',
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const links = navLinks[user.role] ?? []
  const dashboardPath = getDashboardPath(user.role)

  return (
    <nav className="sticky top-0 z-50 flex h-14 items-center gap-1 border-b bg-emerald-900 px-4 shadow-md">
      <NavLink to={dashboardPath} className="mr-6 flex items-center gap-2 text-white">
        <Leaf className="h-5 w-5 text-emerald-300" />
        <span className="text-lg font-bold tracking-tight">SmartDiet</span>
      </NavLink>

      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to.split('/').length === 2}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-emerald-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {l.icon}
            <span className="hidden sm:inline">{l.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={roleBadge[user.role]}>
          {ROLE_LABELS[user.role]}
        </Badge>
        <span className="hidden text-sm text-emerald-200 sm:block">{user.name}</span>
        <Button
          size="sm"
          variant="ghost"
          className="text-emerald-200 hover:bg-white/10 hover:text-white"
          onClick={() => { logout(); navigate('/') }}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </nav>
  )
}
