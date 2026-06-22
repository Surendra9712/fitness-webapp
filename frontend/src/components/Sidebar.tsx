import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPath } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  ShoppingBag,
  Package,
  Tag,
  ShoppingCart,
  Bell,
  LogOut,
  Leaf,
  User,
  Menu,
  X,
  UserCheck,
} from "lucide-react";
import type { Role } from "@/types";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navLinks: Record<Role, NavItem[]> = {
  admin: [
    {
      to: "/admin",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    { to: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
    {
      to: "/admin/products",
      label: "Products",
      icon: <Package className="h-4 w-4" />,
    },
    {
      to: "/admin/categories",
      label: "Categories",
      icon: <Tag className="h-4 w-4" />,
    },
    {
      to: "/admin/product-requests",
      label: "Requests",
      icon: <Bell className="h-4 w-4" />,
    },
    {
      to: "/admin/orders",
      label: "Orders",
      icon: <ShoppingBag className="h-4 w-4" />,
    },
    {
      to: "/admin/exercises",
      label: "Exercises",
      icon: <Dumbbell className="h-4 w-4" />,
    },
    {
      to: "/admin/trainer-assignments",
      label: "Trainer Assign.",
      icon: <UserCheck className="h-4 w-4" />,
    },
  ],
  dietitian: [
    {
      to: "/trainer",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      to: "/trainer/assignments",
      label: "Assignments",
      icon: <UserCheck className="h-4 w-4" />,
    },
    {
      to: "/trainer/profile",
      label: "My Profile",
      icon: <User className="h-4 w-4" />,
    },
  ],
  user: [
    {
      to: "/customer",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      to: "/products",
      label: "Shop",
      icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
      to: "/customer/orders",
      label: "My Orders",
      icon: <ShoppingBag className="h-4 w-4" />,
    },
    {
      to: "/customer/trainer",
      label: "My Trainer",
      icon: <UserCheck className="h-4 w-4" />,
    },
    {
      to: "/customer/request-product",
      label: "Request",
      icon: <Bell className="h-4 w-4" />,
    },
    {
      to: "/customer/log-exercise",
      label: "Exercise",
      icon: <Dumbbell className="h-4 w-4" />,
    },
    {
      to: "/customer/profile",
      label: "Profile",
      icon: <User className="h-4 w-4" />,
    },
  ],
};

const roleLabel: Record<Role, string> = {
  admin: "Administrator",
  dietitian: "Trainer",
  user: "Customer",
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const links = navLinks[user.role] ?? [];
  const dashboardPath = getDashboardPath(user.role);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-white"
          onClick={() => setOpen(false)}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
            <Leaf className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-base font-bold tracking-tight">
            SmartDiet Pro
          </span>
        </NavLink>
      </div>

      <Separator className="bg-white/10" />

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        <ul className="space-y-0.5">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                end={l.to.split("/").length === 2}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-emerald-500/20 text-white"
                      : "text-emerald-200/80 hover:bg-white/8 hover:text-white"
                  }`
                }
              >
                {l.icon}
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Separator className="bg-white/10" />

      {/* User + logout */}
      <div className="p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/30 text-xs font-bold text-emerald-300">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">
              {user.name}
            </div>
            <div className="truncate text-[11px] text-emerald-300/70">
              {user.email ?? ""}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-emerald-200/80 hover:bg-white/8 hover:text-white"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="fixed left-4 top-3.5 z-50 flex h-7 w-7 items-center justify-center rounded-md bg-emerald-900 text-white lg:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle sidebar"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed inset-y-0 h-screen left-0 z-40 w-60 bg-emerald-950 transition-transform duration-200  lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
