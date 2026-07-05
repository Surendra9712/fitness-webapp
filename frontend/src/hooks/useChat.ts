import { useQuery, useMutation, UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import { endpoint } from "@/api/endpoint.ts";
import { useApi } from "./useApi";
import type { ChatMessage, ChatThread } from "@/types";

// Messenger-style paging: load a small window up front, fetch older messages
// on demand as the user scrolls up, instead of pulling the whole history at once.
export const CHAT_PAGE_SIZE = 30;

interface UseChatReturn {
  GetThreads: () => UseQueryResult<ChatThread[]>;
  GetMessages: (assignmentId?: number) => UseQueryResult<ChatMessage[]>;
  LoadOlderMessages: () => UseMutationResult<
    ChatMessage[],
    Error,
    { assignmentId: number; beforeId: number }
  >;
  MarkThreadRead: () => UseMutationResult<void, Error, number>;
  GetChatUnreadCount: (enabled?: boolean) => UseQueryResult<{ count: number }>;
}

const useChat = (): UseChatReturn => {
  const { api, get: GetThreads } = useApi({
    endpoint: endpoint.chatThreads,
    queryKey: "chatThreads",
  });

  const GetMessages = (assignmentId?: number) =>
    useQuery({
      queryKey: ["chatMessages", assignmentId],
      queryFn: async () => {
        const { data } = await api.get(`chat/${assignmentId}/messages`, {
          params: { page_size: CHAT_PAGE_SIZE },
        });
        return data as ChatMessage[];
      },
      enabled: !!assignmentId,
    });

  const LoadOlderMessages = () =>
    useMutation({
      mutationFn: async ({
        assignmentId,
        beforeId,
      }: {
        assignmentId: number;
        beforeId: number;
      }) => {
        const { data } = await api.get(`chat/${assignmentId}/messages`, {
          params: { before_id: beforeId, page_size: CHAT_PAGE_SIZE },
        });
        return data as ChatMessage[];
      },
    });

  const MarkThreadRead = () =>
    useMutation({
      mutationFn: async (assignmentId: number) => {
        await api.put(`chat/${assignmentId}/read`, {});
      },
    });

  const GetChatUnreadCount = (enabled = true) =>
    useQuery({
      queryKey: ["chatUnreadCount"],
      queryFn: async () => {
        const { data } = await api.get(endpoint.chatUnreadCount);
        return data as { count: number };
      },
      enabled,
      refetchInterval: 15000,
    });

  return {
    GetThreads,
    GetMessages,
    LoadOlderMessages,
    MarkThreadRead,
    GetChatUnreadCount,
  } as UseChatReturn;
};

export default useChat;
