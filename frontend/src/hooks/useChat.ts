import { useQuery, useMutation, UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import { endpoint } from "@/api/endpoint.ts";
import { useApi } from "./useApi";
import type { ChatAttachmentType, ChatMessage, ChatThread } from "@/types";

// Messenger-style paging: load a small window up front, fetch older messages
// on demand as the user scrolls up, instead of pulling the whole history at once.
export const CHAT_PAGE_SIZE = 30;

export interface ChatFileUploadResult {
  url: string;
  filename: string;
  original_name: string;
  file_type: ChatAttachmentType;
  size: number;
}

interface UseChatReturn {
  GetThreads: () => UseQueryResult<ChatThread[]>;
  GetMessages: (assignmentId?: number) => UseQueryResult<ChatMessage[]>;
  LoadOlderMessages: () => UseMutationResult<
    ChatMessage[],
    Error,
    { assignmentId: number; beforeId: number }
  >;
  MarkThreadRead: () => UseMutationResult<void, Error, number>;
  DeleteMessage: () => UseMutationResult<
    void,
    Error,
    { assignmentId: number; messageId: number }
  >;
  UploadChatFile: () => UseMutationResult<ChatFileUploadResult, Error, File>;
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

  const DeleteMessage = () =>
    useMutation({
      mutationFn: async ({
        assignmentId,
        messageId,
      }: {
        assignmentId: number;
        messageId: number;
      }) => {
        await api.delete(`chat/${assignmentId}/messages/${messageId}`);
      },
    });

  const UploadChatFile = () =>
    useMutation({
      mutationFn: async (file: File) => {
        const form = new FormData();
        form.append("file", file);
        const { data } = await api.post(endpoint.uploadChatFile, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return data as ChatFileUploadResult;
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
    DeleteMessage,
    UploadChatFile,
    GetChatUnreadCount,
  } as UseChatReturn;
};

export default useChat;
