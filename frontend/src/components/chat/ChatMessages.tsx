import {
  Trash2,
  FileText,
  Download,
  Phone,
  Video,
  PhoneMissed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/date-utils";
import type { ChatMessage } from "@/types";

function formatCallDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function callSummary(m: ChatMessage) {
  const kind = m.call_type === "video" ? "Video call" : "Audio call";
  if (m.call_outcome === "declined") return `${kind} · Declined`;
  if (m.call_outcome === "canceled") return `${kind} · Missed`;
  return `${kind} · ${formatCallDuration(m.call_duration_seconds ?? 0)}`;
}

interface Props {
  messages: ChatMessage[];
  currentUserId?: number;
  loadingOlder: boolean;
  hasMore: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onDeleteMessage: (message: ChatMessage) => void;
}

export default function ChatMessages({
  messages,
  currentUserId,
  loadingOlder,
  hasMore,
  scrollContainerRef,
  bottomRef,
  onScroll,
  onDeleteMessage,
}: Props) {
  return (
    <div
      ref={scrollContainerRef}
      onScroll={onScroll}
      className="flex-1 space-y-3 overflow-y-auto p-4"
    >
      {loadingOlder && (
        <div className="flex justify-center py-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      )}
      {!hasMore && messages.length > 0 && (
        <p className="pb-1 text-center text-xs text-muted-foreground">
          Beginning of conversation
        </p>
      )}
      {messages.map((m) => {
        const mine = m.sender_id === currentUserId;
        return (
          <div
            key={m.id}
            className={cn("group flex", mine ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "relative max-w-[70%] rounded-2xl px-3.5 py-2 text-sm",
                m?.attachment_type !== "image"
                  ? mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                  : "",
              )}
            >
              {mine && (
                <button
                  type="button"
                  onClick={() => onDeleteMessage(m)}
                  aria-label="Delete message"
                  className="absolute -top-2 -right-2 hidden h-6 w-6 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border hover:text-destructive group-hover:flex"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              {m.attachment_type === "image" && m.attachment_url && (
                <a href={m.attachment_url} target="_blank" rel="noreferrer">
                  <img
                    src={m.attachment_url}
                    alt={m.attachment_name ?? "Image attachment"}
                    className="mb-1 max-h-64 max-w-full rounded-lg object-cover"
                  />
                </a>
              )}
              {m.attachment_type === "call" && (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs",
                    mine
                      ? "border-primary-foreground/30"
                      : "border-border bg-background/60",
                  )}
                >
                  {m.call_outcome === "declined" ||
                  m.call_outcome === "canceled" ? (
                    <PhoneMissed className="h-4 w-4 shrink-0" />
                  ) : m.call_type === "video" ? (
                    <Video className="h-4 w-4 shrink-0" />
                  ) : (
                    <Phone className="h-4 w-4 shrink-0" />
                  )}
                  <span>{callSummary(m)}</span>
                </div>
              )}
              {m.attachment_type === "file" && m.attachment_url && (
                <a
                  href={m.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  download={m.attachment_name ?? undefined}
                  className={cn(
                    "mb-1 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs hover:opacity-80",
                    mine
                      ? "border-primary-foreground/30"
                      : "border-border bg-background/60",
                  )}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">
                    {m.attachment_name ?? "Attachment"}
                  </span>
                  <Download className="h-3.5 w-3.5 shrink-0" />
                </a>
              )}
              {m.content && (
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              )}
              <p
                className={cn(
                  "mt-1 text-[10px] opacity-70",
                  mine ? "text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {timeAgo(m.created_at)}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
