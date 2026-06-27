import { useMutation, UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import { endpoint } from "@/api/endpoint.ts";
import { useApi } from "./useApi";
import type { QueryArgs } from "@/interfaces/iUseApi";
import type {
  DietitianProfile,
  DietitianStats,
  TrainerAssignment,
  User,
  PaginatedResponse,
  UpdateProfilePayload,
  TrainerAssignmentActionPayload,
} from "@/types";

interface UseDietitianReturn {
  GetProfile: (args?: QueryArgs) => UseQueryResult<DietitianProfile>;
  UpdateProfile: () => UseMutationResult<DietitianProfile, Error, UpdateProfilePayload>;
  GetClients: (args?: QueryArgs) => UseQueryResult<PaginatedResponse<User>>;
  GetStats: (args?: QueryArgs) => UseQueryResult<DietitianStats>;
  GetAssignmentRequests: (args?: QueryArgs) => UseQueryResult<PaginatedResponse<TrainerAssignment>>;
  ApproveDietitianAssignment: () => UseMutationResult<void, Error, TrainerAssignmentActionPayload>;
  RejectDietitianAssignment: () => UseMutationResult<void, Error, TrainerAssignmentActionPayload>;
  UploadImage: () => UseMutationResult<{ url: string; filename: string }, Error, File>;
}

const useDietitian = (): UseDietitianReturn => {
  const { api, get: GetProfile, update: UpdateProfile } = useApi({ endpoint: endpoint.dietitianProfile, queryKey: "dietitianProfile" });

  const { get: GetClients } = useApi({ endpoint: endpoint.dietitianUsers, queryKey: "dietitianClients" });

  const { get: GetStats } = useApi({ endpoint: endpoint.dietitianStats, queryKey: "dietitianStats" });

  const { get: GetAssignmentRequests } = useApi({ endpoint: endpoint.dietitianAssignmentRequests, queryKey: "dietitianAssignmentRequests" });

  const ApproveDietitianAssignment = () =>
    useMutation({
      mutationFn: async ({ id, trainer_note }: { id: number; trainer_note?: string }) => {
        const { data } = await api.put(`${endpoint.dietitianAssignmentRequests}/${id}/approve`, { trainer_note });
        return data;
      },
    });

  const RejectDietitianAssignment = () =>
    useMutation({
      mutationFn: async ({ id, trainer_note }: { id: number; trainer_note?: string }) => {
        const { data } = await api.put(`${endpoint.dietitianAssignmentRequests}/${id}/reject`, { trainer_note });
        return data;
      },
    });

  const UploadImage = () =>
    useMutation({
      mutationFn: async (file: File) => {
        const token = localStorage.getItem("token");
        const form = new FormData();
        form.append("image", file);
        const { data } = await api.post(endpoint.uploadImage, form, {
          headers: {
            "Content-Type": "multipart/form-data",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        return data as { url: string; filename: string };
      },
    });

  return {
    GetProfile, UpdateProfile,
    GetClients, GetStats,
    GetAssignmentRequests, ApproveDietitianAssignment, RejectDietitianAssignment,
    UploadImage,
  } as UseDietitianReturn;
};

export default useDietitian;
