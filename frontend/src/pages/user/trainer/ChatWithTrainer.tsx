import { useEffect, useState } from "react";
import { Send, MessageCircle } from "lucide-react";
import useChat from "@/hooks/useChat";
import { useChatThread } from "@/hooks/useChatThread";
import { useChatStore } from "@/store/chatStore";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/date-utils";

export default function ChatWithTrainer() {
  const { user } = useAuth();
  const { GetThreads } = useChat();
  const { data: threads, isLoading: threadsLoading } = GetThreads();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const connect = useChatStore((s) => s.connect);
  const disconnect = useChatStore((s) => s.disconnect);

  const {
    messages,
    scrollContainerRef,
    bottomRef,
    handleScroll,
    loadingOlder,
    hasMore,
    sendMessage,
  } = useChatThread(activeId);

  useEffect(() => {
    connect();
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!threads || threads.length === 0) return;
    setActiveId((prev) => prev ?? threads[0].assignment_id);
  }, [threads]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    sendMessage(activeId, draft.trim());
    setDraft("");
  }

  const activeThread = threads?.find((t) => t.assignment_id === activeId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chat</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Message your trainers in real time.
        </p>
      </div>

      <Card className="flex h-[70vh] overflow-hidden p-0">
        {/* Thread list */}
        <div className="w-64 shrink-0 border-r overflow-y-auto">
          {threadsLoading && (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          )}
          {threads?.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              You don't have an approved trainer yet. Once a trainer request is
              approved, you'll be able to chat here.
            </p>
          )}
          {threads?.map((t) => (
            <button
              key={t.assignment_id}
              onClick={() => setActiveId(t.assignment_id)}
              className={cn(
                "flex w-full items-center gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/50",
                activeId === t.assignment_id && "bg-muted",
              )}
            >
              <Avatar>
                <AvatarImage src={t.peer_image_url ?? undefined} />
                <AvatarFallback className="text-sm">
                  {t.peer_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {t.peer_name}
                  </span>
                  {t.unread_count > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {t.unread_count > 99 ? "99+" : t.unread_count}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {t.last_message ?? "No messages yet"}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Active thread */}
        <div className="flex flex-1 flex-col">
          {!activeThread ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <MessageCircle className="h-8 w-8" />
              <p className="text-sm">Select a trainer to start chatting</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={activeThread.peer_image_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {activeThread.peer_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {activeThread.peer_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeThread.peer_email}
                  </p>
                </div>
              </div>

              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
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
                  const mine = m.sender_id === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex",
                        mine ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-3.5 py-2 text-sm",
                          mine
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {m.content}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-[10px] opacity-70",
                            mine
                              ? "text-primary-foreground"
                              : "text-muted-foreground",
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

              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 border-t p-3"
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!draft.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
