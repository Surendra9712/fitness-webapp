import { create } from "zustand";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { queryClient } from "@/lib/queryClient";
import type { ChatAttachmentType, ChatMessage } from "@/types";

export interface ChatAttachment {
  url: string;
  type: ChatAttachmentType;
  name?: string;
}

// Stable reference so selectors falling back to "no messages yet" don't
// produce a new array identity on every render (which would trigger an
// infinite render loop with zustand's reference-equality subscriptions).
export const EMPTY_MESSAGES: ChatMessage[] = [];

interface ChatState {
  messagesByAssignment: Record<number, ChatMessage[]>;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  joinThread: (assignmentId: number) => void;
  sendMessage: (assignmentId: number, content: string, attachment?: ChatAttachment) => void;
  mergeMessages: (assignmentId: number, incoming: ChatMessage[]) => void;
  prependMessages: (assignmentId: number, olderMessages: ChatMessage[]) => void;
  appendMessage: (message: ChatMessage) => void;
  removeMessage: (assignmentId: number, messageId: number) => void;
}

let listenersBound = false;

export const useChatStore = create<ChatState>((set, get) => ({
  messagesByAssignment: {},
  connected: false,

  connect: () => {
    const socket = connectSocket();
    if (!listenersBound) {
      socket.on("connect", () => set({ connected: true }));
      socket.on("disconnect", () => set({ connected: false }));
      socket.on("new_message", (message: ChatMessage) => {
        get().appendMessage(message);
        // Refresh the thread list (last-message preview, unread counts) for
        // every incoming message, not just the currently open thread — a
        // message for a background thread never touches that thread's own
        // hook instance, so this has to happen at the single point that
        // actually sees every message regardless of which thread is active.
        queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
        queryClient.invalidateQueries({ queryKey: ["chatUnreadCount"] });
      });
      socket.on("message_deleted", ({ id, assignment_id }: { id: number; assignment_id: number }) => {
        get().removeMessage(assignment_id, id);
        queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
      });
      listenersBound = true;
    }
  },

  disconnect: () => {
    disconnectSocket();
    set({ connected: false });
  },

  joinThread: (assignmentId) => {
    getSocket().emit("join_thread", { assignment_id: assignmentId });
  },

  sendMessage: (assignmentId, content, attachment) => {
    getSocket().emit("send_message", {
      assignment_id: assignmentId,
      content,
      ...(attachment && {
        attachment_url: attachment.url,
        attachment_type: attachment.type,
        attachment_name: attachment.name,
      }),
    });
  },

  // Merges a REST response into the store instead of replacing it outright.
  // A REST fetch for a thread can resolve with stale/cached data (e.g. when
  // switching back to a previously-open thread) — replacing the array
  // wholesale would then clobber newer messages already appended live via
  // the socket. Merging by id keeps whichever messages are already known,
  // while still picking up field updates (like is_read) from the fetch.
  mergeMessages: (assignmentId, incoming) =>
    set((state) => {
      const existing = state.messagesByAssignment[assignmentId] ?? [];
      const byId = new Map(existing.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      const merged = Array.from(byId.values()).sort((a, b) => a.id - b.id);
      return {
        messagesByAssignment: { ...state.messagesByAssignment, [assignmentId]: merged },
      };
    }),

  prependMessages: (assignmentId, olderMessages) =>
    set((state) => {
      const existing = state.messagesByAssignment[assignmentId] ?? [];
      const existingIds = new Set(existing.map((m) => m.id));
      const deduped = olderMessages.filter((m) => !existingIds.has(m.id));
      if (deduped.length === 0) return state;
      return {
        messagesByAssignment: {
          ...state.messagesByAssignment,
          [assignmentId]: [...deduped, ...existing],
        },
      };
    }),

  appendMessage: (message) =>
    set((state) => {
      const existing = state.messagesByAssignment[message.assignment_id] ?? [];
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messagesByAssignment: {
          ...state.messagesByAssignment,
          [message.assignment_id]: [...existing, message],
        },
      };
    }),

  removeMessage: (assignmentId, messageId) =>
    set((state) => {
      const existing = state.messagesByAssignment[assignmentId];
      if (!existing || !existing.some((m) => m.id === messageId)) return state;
      return {
        messagesByAssignment: {
          ...state.messagesByAssignment,
          [assignmentId]: existing.filter((m) => m.id !== messageId),
        },
      };
    }),
}));
