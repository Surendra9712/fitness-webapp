import { useEffect, useState } from "react";
import { MessageCircle, Phone, Video } from "lucide-react";
import useChat from "@/hooks/useChat";
import { useChatThread } from "@/hooks/useChatThread";
import { useCallStore } from "@/store/callStore";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import ChatMessages from "@/components/chat/ChatMessages";
import ChatComposer from "@/components/chat/ChatComposer";
import { cn } from "@/lib/utils";

export default function ChatWithTrainer() {
  const { user } = useAuth();
  const { GetThreads } = useChat();
  const { data: threads, isLoading: threadsLoading } = GetThreads();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const callStatus = useCallStore((s) => s.status);
  const startCall = useCallStore((s) => s.startCall);

  const {
    messages,
    scrollContainerRef,
    bottomRef,
    handleScroll,
    loadingOlder,
    hasMore,
    sendMessage,
    deleteTarget,
    requestDelete,
    cancelDelete,
    confirmDelete,
    uploading,
    sendAttachment,
  } = useChatThread(activeId);

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
                <div className="ml-auto flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={callStatus !== "idle"}
                    aria-label="Start audio call"
                    onClick={() =>
                      startCall(
                        activeThread.assignment_id,
                        activeThread.peer_id,
                        activeThread.peer_name,
                        activeThread.peer_image_url,
                        "audio",
                      )
                    }
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={callStatus !== "idle"}
                    aria-label="Start video call"
                    onClick={() =>
                      startCall(
                        activeThread.assignment_id,
                        activeThread.peer_id,
                        activeThread.peer_name,
                        activeThread.peer_image_url,
                        "video",
                      )
                    }
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ChatMessages
                messages={messages}
                currentUserId={user?.id}
                loadingOlder={loadingOlder}
                hasMore={hasMore}
                scrollContainerRef={scrollContainerRef}
                bottomRef={bottomRef}
                onScroll={handleScroll}
                onDeleteMessage={requestDelete}
              />

              <ChatComposer
                draft={draft}
                onDraftChange={setDraft}
                onSend={handleSend}
                onAttach={sendAttachment}
                uploading={uploading}
              />
            </>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && cancelDelete()}
        title="Delete message?"
        description="This message will be removed for both you and the other person."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
