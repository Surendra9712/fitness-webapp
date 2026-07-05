import { useState, useMemo } from "react";
import { Search, Send, Users, Mail, Dumbbell, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AppPagination } from "@/components/ui/app-pagination";
import { StarDisplay } from "@/components/ui/star-rating";
import type { TrainerInfo } from "@/types";
import { AvatarImage } from "@radix-ui/react-avatar";

const PAGE_SIZE = 5;

const AVATAR_GRADIENTS = [
  "from-emerald-400 to-teal-600",
  "from-green-400 to-emerald-600",
  "from-secondary-400 to-secondary-700",
  "from-violet-400 to-purple-600",
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-500",
  "from-cyan-400 to-sky-600",
];

function avatarGradient(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

const PENDING_STATUS_LABEL: Record<string, string> = {
  pending_trainer: "Awaiting Trainer",
  pending_admin: "Awaiting Admin",
};

interface Props {
  trainers: TrainerInfo[];
  onRequest: (trainer: TrainerInfo) => void;
  onCancel: (trainer: TrainerInfo) => void;
  onViewDetail: (trainer: TrainerInfo) => void;
}

export function TrainerList({ trainers, onRequest, onCancel, onViewDetail }: Props) {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  function applySearch() {
    setAppliedSearch(searchInput);
  }

  return (
    <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-5 border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">
            Available <span className="text-primary">Trainers</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-muted px-3.5 py-1.5 text-sm font-semibold text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {trainers.length} trainer{trainers.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Search ── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-muted/20">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground"
          />
        </div>
        <Button className="gap-2 rounded-xl px-5" onClick={applySearch}>
          <Search className="h-3.5 w-3.5" />
          Search
        </Button>
      </div>

      {/* ── Rows ── */}
      <div className="divide-y">
        {trainers.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted-foreground">
            No trainers found{appliedSearch ? ` for "${appliedSearch}"` : ""}.
          </div>
        ) : (
          trainers.map((t) => {
            const available = !t.customer_count || t.customer_count === 0;
            const isPending = !!t.my_pending_assignment_id;
            return (
              <div
                key={t.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
              >
                {/* Avatar */}
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarFallback
                    className={`bg-gradient-to-br ${avatarGradient(t.name)} text-white font-black text-lg`}
                  >
                    {t.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                  <AvatarImage src={t.profile_image_url} />
                </Avatar>

                {/* Name + status */}
                <div className="w-44 shrink-0">
                  <button
                    type="button"
                    onClick={() => onViewDetail(t)}
                    className="font-bold text-foreground hover:text-primary transition-colors leading-snug line-clamp-1 text-left"
                  >
                    {t.name}
                  </button>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {isPending ? (
                      <>
                        <Clock className="h-3 w-3 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-600">
                          {PENDING_STATUS_LABEL[t.my_pending_status ?? ""] ?? "Requested"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span
                          className={`h-2 w-2 rounded-full ${available ? "bg-emerald-500" : "bg-secondary-500"}`}
                        />
                        <span
                          className={`text-xs font-semibold ${available ? "text-emerald-600" : "text-secondary-600"}`}
                        >
                          {available ? "Available" : "Active"}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex flex-1 min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t.email}</span>
                </div>

                {/* Rating */}
                <div className="shrink-0 w-28">
                  {t.avg_rating && t.avg_rating > 0 ? (
                    <StarDisplay
                      value={t.avg_rating}
                      count={t.review_count}
                      size="sm"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No reviews
                    </span>
                  )}
                </div>

                {/* Clients pill */}
                <div className="shrink-0 flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-sm font-semibold">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Clients
                  <span className="ml-0.5">{t.customer_count ?? 0}</span>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full px-4 text-xs"
                    onClick={() => onViewDetail(t)}
                  >
                    View
                  </Button>
                  {isPending ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full gap-1.5 px-4 text-xs font-bold text-destructive border-destructive/40 hover:bg-red-50"
                      onClick={() => onCancel(t)}
                    >
                      <X className="h-3 w-3" />
                      Cancel Request
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="rounded-full gap-1.5 px-4 text-xs font-bold"
                      onClick={() => onRequest(t)}
                    >
                      <Send className="h-3 w-3" />
                      Request
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
