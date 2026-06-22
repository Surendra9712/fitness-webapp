import { useMutation } from "@tanstack/react-query";
import { endpoint } from "@/api/endpoint.ts";
import { useApi } from "./useApi";

const useDietitian = (): any => {
  const { api, get: GetClients } = useApi({ endpoint: endpoint.dietitianUsers, queryKey: "dietitianClients" });

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

  return {
    GetClients, GetStats,
    GetAssignmentRequests, ApproveDietitianAssignment, RejectDietitianAssignment,
  };
};

export default useDietitian;
