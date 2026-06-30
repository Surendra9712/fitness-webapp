import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Bell,
  Percent,
  Copy,
  CheckCheck,
  CalendarDays,
  ShoppingBag,
  Users,
  Tag,
  Package,
  ShoppingCart,
  Crown,
  UserCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  BellOff,
} from "lucide-react";
import useUser from "@/hooks/useUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { PromoCode, Notification, NotificationType } from "@/types";
import moment from "moment";
import { daysLeft, timeAgo } from "@/lib/date-utils";

function PromoCard({ promo }: { promo: PromoCode }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(promo.code).then(() => {
      setCopied(true);
      toast.success(`Code "${promo.code}" copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const remaining =
    promo.max_uses != null ? promo.max_uses - promo.current_uses : null;
  const expiresIn = promo.valid_to ? daysLeft(promo.valid_to) : null;
  const urgentExpiry = expiresIn !== null && expiresIn <= 3;
  const lowStock = remaining !== null && remaining <= 10;

  return (
    <div className="group relative rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
      <div
        className={`absolute left-0 top-0 h-full w-1.5 ${
          promo.discount_type === "percentage" ? "bg-primary" : "bg-amber-500"
        }`}
      />
      <div className="pl-5 pr-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                promo.discount_type === "percentage"
                  ? "bg-primary/10"
                  : "bg-amber-100"
              }`}
            >
              <Percent
                className={`h-5 w-5 ${
                  promo.discount_type === "percentage"
                    ? "text-primary"
                    : "text-amber-600"
                }`}
              />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">
                {promo.discount_type === "percentage"
                  ? `${promo.discount_value}% OFF`
                  : `Rs. ${promo.discount_value} OFF`}
              </p>
              {promo.description && (
                <p className="text-sm text-muted-foreground leading-snug">
                  {promo.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end shrink-0">
            {urgentExpiry && expiresIn! <= 0 ? (
              <Badge variant="destructive" className="text-xs">
                Expires today
              </Badge>
            ) : urgentExpiry ? (
              <Badge variant="warning" className="text-xs">
                {expiresIn}d left
              </Badge>
            ) : null}
            {lowStock && remaining! > 0 && (
              <Badge variant="warning" className="text-xs">
                {remaining} left
              </Badge>
            )}
          </div>
        </div>

        <button
          onClick={copyCode}
          className="mt-3 flex w-full items-center justify-between rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/40 px-3 py-2 hover:border-primary/50 hover:bg-primary/5 transition-colors group/copy"
        >
          <span className="font-mono font-bold text-sm tracking-widest text-foreground">
            {promo.code}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover/copy:text-primary transition-colors">
            {copied ? (
              <>
                <CheckCheck className="h-3.5 w-3.5 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Tap to copy
              </>
            )}
          </span>
        </button>

        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          {promo.min_order_amount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShoppingBag className="h-3 w-3" />
              Min order Rs. {promo.min_order_amount}
            </div>
          )}
          {promo.valid_to && (
            <div
              className={`flex items-center gap-1 text-xs ${urgentExpiry ? "text-amber-600 font-medium" : "text-muted-foreground"}`}
            >
              <CalendarDays className="h-3 w-3" />
              Valid until{" "}
              {new Date(promo.valid_to).toLocaleDateString("en-NP", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          )}
          {remaining !== null && (
            <div
              className={`flex items-center gap-1 text-xs ${lowStock ? "text-amber-600 font-medium" : "text-muted-foreground"}`}
            >
              <Users className="h-3 w-3" />
              {remaining} use{remaining !== 1 ? "s" : ""} remaining
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Notification helpers ───────────────────────────────────────────────────────

const notificationMeta: Record<
  NotificationType,
  { icon: React.ReactNode; color: string }
> = {
  order_received: {
    icon: <ShoppingCart className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-600",
  },
  order_status: {
    icon: <ShoppingBag className="h-4 w-4" />,
    color: "bg-indigo-100 text-indigo-600",
  },
  subscription_request: {
    icon: <Crown className="h-4 w-4" />,
    color: "bg-yellow-100 text-yellow-700",
  },
  subscription_approved: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "bg-green-100 text-green-600",
  },
  subscription_rejected: {
    icon: <XCircle className="h-4 w-4" />,
    color: "bg-red-100 text-red-600",
  },
  product_request: {
    icon: <Package className="h-4 w-4" />,
    color: "bg-orange-100 text-orange-600",
  },
  product_request_approved: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "bg-green-100 text-green-600",
  },
  product_request_rejected: {
    icon: <XCircle className="h-4 w-4" />,
    color: "bg-red-100 text-red-600",
  },
  trainer_request: {
    icon: <UserCheck className="h-4 w-4" />,
    color: "bg-purple-100 text-purple-600",
  },
  trainer_request_to_admin: {
    icon: <UserCheck className="h-4 w-4" />,
    color: "bg-purple-100 text-purple-600",
  },
  trainer_accepted: {
    icon: <UserCheck className="h-4 w-4" />,
    color: "bg-teal-100 text-teal-600",
  },
  trainer_approved: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "bg-green-100 text-green-600",
  },
  trainer_rejected: {
    icon: <XCircle className="h-4 w-4" />,
    color: "bg-red-100 text-red-600",
  },
};

function NotificationItem({
  notification,
  onRead,
  onDelete,
}: {
  notification: Notification;
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const meta = notificationMeta[notification.type] ?? {
    icon: <Bell className="h-4 w-4" />,
    color: "bg-gray-100 text-gray-600",
  };
  const isRead = Boolean(notification.is_read);

  return (
    <div
      className={`flex gap-3 rounded-xl border p-4 transition-colors ${
        isRead ? "bg-card opacity-70" : "bg-card border-primary/20 shadow-sm"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.color}`}
      >
        {meta.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm font-semibold leading-snug ${isRead ? "" : "text-foreground"}`}
          >
            {notification.title}
            {!isRead && (
              <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" />
            )}
          </p>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {timeAgo(notification.created_at)}
          </span>
        </div>
        {notification.message && (
          <p className="mt-0.5 text-sm text-muted-foreground leading-snug">
            {notification.message}
          </p>
        )}
        <div className="mt-2 flex gap-2">
          {!isRead && (
            <button
              onClick={() => onRead(notification.id)}
              className="text-xs text-primary hover:underline"
            >
              Mark as read
            </button>
          )}
          <button
            onClick={() => onDelete(notification.id)}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-0.5"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type Tab = "notifications" | "promos";

export default function Notifications() {
  const { user } = useAuth();
  const isTrainee = user?.role === "trainee";
  const [tab, setTab] = useState<Tab>("notifications");
  const qc = useQueryClient();

  const {
    GetAvailablePromos,
    GetNotifications,
    MarkRead,
    MarkAllRead,
    DeleteNotification,
  } = useUser();

  const { data: promoData, isLoading: promosLoading } = GetAvailablePromos({
    enabled: isTrainee,
  });
  const promos: PromoCode[] = isTrainee
    ? ((promoData as PromoCode[] | undefined) ?? [])
    : [];

  const { data: notifData, isLoading: notifsLoading } = GetNotifications({});
  const notifications: Notification[] = (notifData as any)?.items ?? [];
  const unread = notifications.filter((n) => !n.is_read).length;

  const markRead = MarkRead();
  const markAllRead = MarkAllRead();
  const deleteNotif = DeleteNotification();

  function handleMarkRead(id: number) {
    markRead.mutate(id, {
      onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    });
  }

  function handleMarkAllRead() {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["notificationsUnreadCount"] });
        toast.success("All notifications marked as read");
      },
    });
  }

  function handleDelete(id: number) {
    deleteNotif.mutate(id, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["notificationsUnreadCount"] });
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stay updated on your orders, subscriptions, and more.
          </p>
        </div>
        {tab === "notifications" && unread > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Tabs — promo codes tab only for trainees */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("notifications")}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
            tab === "notifications"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Activity
          {unread > 0 && (
            <Badge variant="default" className="ml-2 text-xs px-1.5 py-0">
              {unread}
            </Badge>
          )}
        </button>
        {isTrainee && (
          <button
            onClick={() => setTab("promos")}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === "promos"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Promo Codes
            {promos.length > 0 && (
              <Badge variant="info" className="ml-2 text-xs px-1.5 py-0">
                {promos.length}
              </Badge>
            )}
          </button>
        )}
      </div>

      {/* Notifications tab */}
      {tab === "notifications" && (
        <>
          {notifsLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-24 text-center rounded-xl border bg-muted/20">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <BellOff className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-lg">No notifications yet</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Activity updates — order statuses, subscription approvals,
                trainer assignments — will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={handleMarkRead}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Promo codes tab */}
      {tab === "promos" && (
        <>
          {promosLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : promos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-24 text-center rounded-xl border bg-muted/20">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Tag className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-lg">No promo codes available</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Check back later — new discount codes will appear here as soon
                as they become available.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Tap any code to copy it, then paste it at checkout to apply the
                discount.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {promos.map((p) => (
                  <PromoCard key={p.id} promo={p} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
