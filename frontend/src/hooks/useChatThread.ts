import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useChat, { CHAT_PAGE_SIZE } from "./useChat";
import { useChatStore, EMPTY_MESSAGES } from "@/store/chatStore";
import type { ChatThread } from "@/types";

const NEAR_BOTTOM_PX = 120;
const LOAD_MORE_PX = 80;

// Messenger-style thread behaviour, shared by the trainer and trainee chat pages:
// - jumps to the bottom instantly on first open (no visible scroll animation)
// - only loads a page of recent messages up front, fetching older ones on demand
//   as the user scrolls up, preserving their exact scroll position while doing so
// - only auto-scrolls (smoothly) for new incoming messages if already near the bottom
export function useChatThread(activeId: number | null) {
  const queryClient = useQueryClient();
  const { GetMessages, LoadOlderMessages, MarkThreadRead } = useChat();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const isNearBottom = useRef(true);
  const pendingScrollAdjust = useRef<{ prevScrollHeight: number; prevScrollTop: number } | null>(null);

  const [hasMore, setHasMore] = useState(true);

  const joinThread = useChatStore((s) => s.joinThread);
  const mergeMessages = useChatStore((s) => s.mergeMessages);
  const prependMessages = useChatStore((s) => s.prependMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const messagesRaw = useChatStore((s) => (activeId ? s.messagesByAssignment[activeId] : undefined));
  const messages = messagesRaw ?? EMPTY_MESSAGES;

  const { data: history } = GetMessages(activeId ?? undefined);
  const markRead = MarkThreadRead();
  const loadOlder = LoadOlderMessages();

  // Reset scroll/pagination bookkeeping before the scroll-effect below runs for
  // the newly selected thread (declared first so its layout effect commits first).
  useLayoutEffect(() => {
    isInitialLoad.current = true;
    isNearBottom.current = true;
    pendingScrollAdjust.current = null;
    setHasMore(true);
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    joinThread(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Keep the open thread's unread count at zero: mark it read as soon as it's
  // selected, and again whenever new messages arrive while it stays open —
  // otherwise a message received while you're already looking at that
  // conversation would still linger as "unread" in the thread list / nav badge.
  useEffect(() => {
    if (!activeId || messages.length === 0) return;

    // Optimistic: zero the sidebar badge immediately instead of waiting on
    // the round-trip below.
    queryClient.setQueriesData<ChatThread[]>({ queryKey: ["chatThreads"] }, (old) =>
      old?.map((t) => (t.assignment_id === activeId ? { ...t, unread_count: 0 } : t)),
    );

    markRead.mutate(activeId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["chatUnreadCount"] });
        queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, messages.length]);

  useEffect(() => {
    if (!activeId || !history) return;
    mergeMessages(activeId, history);
    setHasMore(history.length >= CHAT_PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, history]);

  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || messages.length === 0) return;

    if (pendingScrollAdjust.current) {
      const { prevScrollHeight, prevScrollTop } = pendingScrollAdjust.current;
      el.scrollTop = el.scrollHeight - prevScrollHeight + prevScrollTop;
      pendingScrollAdjust.current = null;
      return;
    }

    if (isInitialLoad.current) {
      el.scrollTop = el.scrollHeight;
      isInitialLoad.current = false;
      return;
    }

    if (isNearBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;

    if (
      el.scrollTop < LOAD_MORE_PX &&
      hasMore &&
      !loadOlder.isPending &&
      activeId &&
      messages.length > 0
    ) {
      const oldestId = messages[0].id;
      pendingScrollAdjust.current = { prevScrollHeight: el.scrollHeight, prevScrollTop: el.scrollTop };
      loadOlder
        .mutateAsync({ assignmentId: activeId, beforeId: oldestId })
        .then((older) => {
          if (older.length < CHAT_PAGE_SIZE) setHasMore(false);
          if (older.length > 0) {
            prependMessages(activeId, older);
          } else {
            pendingScrollAdjust.current = null;
          }
        })
        .catch(() => {
          pendingScrollAdjust.current = null;
        });
    }
  }

  return {
    messages,
    scrollContainerRef,
    bottomRef,
    handleScroll,
    loadingOlder: loadOlder.isPending,
    hasMore,
    sendMessage,
  };
}
