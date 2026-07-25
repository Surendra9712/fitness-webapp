import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  avatarInitial,
  getDashboardPath,
  getProfilePath,
} from "@/lib/constant";
import { useChatStore } from "@/store/chatStore";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Tag,
  ShoppingCart,
  Bell,
  LogOut,
  User,
  X,
  UserCheck,
  UserRound,
  ShieldCheck,
  Crown,
  Sparkles,
  Percent,
  Gift,
  BadgePercent,
  BarChart3,
  MessageCircle,
  ChevronsUpDown,
  Inbox,
} from "lucide-react";
import type { Role } from "@/types";
import useUser from "@/hooks/useUser";
import useChat from "@/hooks/useChat";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navLinks: Record<Role, NavItem[]> = {
  admin: [
    {
      to: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    // { to: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
    {
      to: "/admin/trainee-management",
      label: "Trainees",
      icon: <UserRound className="h-4 w-4" />,
    },
    {
      to: "/admin/trainer-management",
      label: "Trainers",
      icon: <UserCheck className="h-4 w-4" />,
    },
    {
      to: "/admin/product-management",
      label: "Products",
      icon: <Package className="h-4 w-4" />,
    },
    {
      to: "/admin/category-management",
      label: "Categories",
      icon: <Tag className="h-4 w-4" />,
    },
    {
      to: "/admin/product-requests",
      label: "Requests",
      icon: <Bell className="h-4 w-4" />,
    },
    {
      to: "/admin/order-management",
      label: "Orders",
      icon: <ShoppingBag className="h-4 w-4" />,
    },
    {
      to: "/admin/trainer-assignments",
      label: "Trainer Assign.",
      icon: <UserCheck className="h-4 w-4" />,
    },
    {
      to: "/admin/trainer-verification",
      label: "Trainer Request",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      to: "/admin/subscription-plans",
      label: "Subscriptions",
      icon: <Crown className="h-4 w-4" />,
    },
    {
      to: "/admin/promo-codes",
      label: "Promo Codes",
      icon: <Percent className="h-4 w-4" />,
    },
    {
      to: "/admin/discount-management",
      label: "Discounts",
      icon: <BadgePercent className="h-4 w-4" />,
    },
    {
      to: "/admin/contact-messages",
      label: "Messages",
      icon: <Inbox className="h-4 w-4" />,
    },
    {
      to: "/admin/notifications",
      label: "Notifications",
      icon: <Bell className="h-4 w-4" />,
    },
  ],
  dietitian: [
    {
      to: "/trainer-dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      to: "/trainer/assignment-requests",
      label: "Assignments",
      icon: <UserCheck className="h-4 w-4" />,
    },
    {
      to: "/products",
      label: "Shop",
      icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
      to: "/trainer/my-orders",
      label: "My Orders",
      icon: <ShoppingBag className="h-4 w-4" />,
    },
    {
      to: "/trainer/my-rewards",
      label: "Rewards",
      icon: <Gift className="h-4 w-4" />,
    },
    {
      to: "/trainer/chat",
      label: "Chat",
      icon: <MessageCircle className="h-4 w-4" />,
    },
    {
      to: "/trainer/notifications",
      label: "Notifications",
      icon: <Bell className="h-4 w-4" />,
    },
  ],
  trainee: [
    {
      to: "/my-dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      to: "/products",
      label: "Shop",
      icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
      to: "/trainee/my-orders",
      label: "My Orders",
      icon: <ShoppingBag className="h-4 w-4" />,
    },
    {
      to: "/trainee/trainers",
      label: "Trainers",
      icon: <UserCheck className="h-4 w-4" />,
    },
    {
      to: "/trainee/chat",
      label: "Chat",
      icon: <MessageCircle className="h-4 w-4" />,
    },
    {
      to: "/trainee/request-product",
      label: "Request",
      icon: <Bell className="h-4 w-4" />,
    },

    {
      to: "/trainee/subscription",
      label: "Subscription",
      icon: <Crown className="h-4 w-4" />,
    },
    {
      to: "/trainee/ai-recommendations",
      label: "AI Recommendation",
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      to: "/trainee/weekly-report",
      label: "Weekly Report",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      to: "/trainee/my-rewards",
      label: "Rewards",
      icon: <Gift className="h-4 w-4" />,
    },
    {
      to: "/trainee/notifications",
      label: "Notifications",
      icon: <Bell className="h-4 w-4" />,
    },
  ],
};

const roleLabel: Record<Role, string> = {
  admin: "Administrator",
  dietitian: "Trainer",
  trainee: "Trainee",
};

interface SidebarProps {
  open: boolean;
  setOpen: (v: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { GetUnreadCount } = useUser();
  const { data: unreadData } = GetUnreadCount();
  const unreadCount = unreadData?.count ?? 0;

  const isChatRole = user?.role === "trainee" || user?.role === "dietitian";
  const { GetChatUnreadCount } = useChat();
  const { data: chatUnreadData } = GetChatUnreadCount(isChatRole);
  const chatUnreadCount = chatUnreadData?.count ?? 0;

  const connect = useChatStore((s) => s.connect);
  const disconnect = useChatStore((s) => s.disconnect);

  // Connect once for the whole authenticated session (Sidebar persists across
  // page navigation and only unmounts on logout) rather than per-page, so
  // real-time chat delivery and incoming calls work app-wide, not just while
  // the Chat page happens to be open.
  useEffect(() => {
    if (!isChatRole) return;
    connect();
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChatRole]);

  if (!user) return null;

  const links = navLinks[user.role] ?? [];
  const dashboardPath = getDashboardPath(user.role);
  const profilePath = getProfilePath(user.role);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-white"
          onClick={() => setOpen(false)}
        >
          <img
            src={import.meta.env.VITE_APP_LOGO}
            alt={import.meta.env.VITE_APP_NAME}
            className="h-14 w-auto"
          />
        </NavLink>
        <Button
          size={"icon"}
          className=" size-8 min-w-8"
          onClick={() => setOpen(false)}
          aria-label="Close sidebar"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <Separator className="bg-white/10" />

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        <ul className="space-y-0.5">
          {links.map((l) => {
            const isNotifLink = l.label === "Notifications";
            const isChatLink = l.label === "Chat";
            return (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.to.split("/").length === 2}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                    ${
                      isActive
                        ? "bg-primary-500/20 text-white"
                        : "text-primary-200/80 hover:bg-white/8 hover:text-white"
                    }`
                  }
                >
                  {l.icon}
                  <span className="flex-1">{l.label}</span>
                  {isNotifLink && unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                  {isChatLink && chatUnreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator className="bg-white/10" />

      {/* User + logout */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/10">
              <Avatar variant={"muted"}>
                <AvatarFallback>
                  {avatarInitial(user?.name || user?.full_name)}
                </AvatarFallback>
                <AvatarImage src={user.profile_image_url} alt={user.name} />
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">
                  {user.name}
                </div>
                <div className="truncate text-[11px] text-primary-300/70">
                  {user.email ?? ""}
                </div>
              </div>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-primary-300/70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {roleLabel[user.role]}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profilePath && (
              <DropdownMenuItem
                onClick={() => {
                  setOpen(false);
                  navigate(profilePath);
                }}
              >
                <User className="h-4 w-4" />
                Profile
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                setOpen(false);
                logout();
                navigate("/");
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      {/* <button
        className={`fixed ${open ? "left-50" : "left-4"} top-3.5 z-50 flex h-7 w-7 items-center justify-center rounded-md bg-primary-900 text-white lg:hidden`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle sidebar"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button> */}

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed inset-y-0 h-screen left-0 z-40 w-60 bg-primary-950 transition-transform duration-200  lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
