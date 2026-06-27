import { useMutation, UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import { endpoint } from "@/api/endpoint.ts";
import { useApi } from "./useApi";
import type { QueryArgs } from "@/interfaces/iUseApi";
import type {
  DietitianProfile,
  DietitianStats,
  TrainerAssignment,
  TrainerCertification,
  User,
  PaginatedResponse,
  UpdateProfilePayload,
  TrainerAssignmentActionPayload,
} from "@/types";

export interface AddCertPayload {
  name: string;
  issued_by?: string | null;
  issued_date?: string | null;
  file_url?: string | null;
  file_type: string;
}

interface UseDietitianReturn {
  GetProfile: (args?: QueryArgs) => UseQueryResult<DietitianProfile>;
  UpdateProfile: () => UseMutationResult<DietitianProfile, Error, UpdateProfilePayload>;
  GetClients: (args?: QueryArgs) => UseQueryResult<PaginatedResponse<User>>;
  GetStats: (args?: QueryArgs) => UseQueryResult<DietitianStats>;
  GetAssignmentRequests: (args?: QueryArgs) => UseQueryResult<PaginatedResponse<TrainerAssignment>>;
  ApproveDietitianAssignment: () => UseMutationResult<void, Error, TrainerAssignmentActionPayload>;
  RejectDietitianAssignment: () => UseMutationResult<void, Error, TrainerAssignmentActionPayload>;
  UploadImage: () => UseMutationResult<{ url: string; filename: string }, Error, File>;
  AddCertification: () => UseMutationResult<TrainerCertification, Error, AddCertPayload>;
  DeleteCertification: () => UseMutationResult<void, Error, number>;
  UploadCert: () => UseMutationResult<{ url: string; file_type: "image" | "pdf" }, Error, File>;
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

  const AddCertification = () =>
    useMutation({
      mutationFn: async (payload: AddCertPayload) => {
        const { data } = await api.post(endpoint.dietitianCertifications, payload);
        return data as TrainerCertification;
      },
    });

  const DeleteCertification = () =>
    useMutation({
      mutationFn: async (certId: number) => {
        await api.delete(`${endpoint.dietitianCertifications}/${certId}`);
      },
    });

  const UploadCert = () =>
    useMutation({
      mutationFn: async (file: File) => {
        const form = new FormData();
        form.append("file", file);
        const { data } = await api.post(endpoint.uploadCert, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return data as { url: string; file_type: "image" | "pdf" };
      },
    });

  return {
    GetProfile, UpdateProfile,
    GetClients, GetStats,
    GetAssignmentRequests, ApproveDietitianAssignment, RejectDietitianAssignment,
    UploadImage, AddCertification, DeleteCertification, UploadCert,
  } as UseDietitianReturn;
};

export default useDietitian;
