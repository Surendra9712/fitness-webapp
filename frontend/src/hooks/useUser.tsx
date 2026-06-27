import {
  useQuery,
  useMutation,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import { endpoint } from "@/api/endpoint.ts";
import { useApi } from "./useApi";
import type { QueryArgs } from "@/interfaces/iUseApi";
import type {
  TrainerInfo,
  TrainerAssignment,
  Order,
  ProductRequest,
  Exercise,
  ExerciseLog,
  ReviewStats,
  PaginatedResponse,
  CreateOrderPayload,
  CreateProductRequestPayload,
  LogExercisePayload,
  ReviewPayload,
  RequestTrainerPayload,
} from "@/types";

interface UseUserReturn {
  GetTrainers: (
    args?: QueryArgs,
  ) => UseQueryResult<PaginatedResponse<TrainerInfo>>;
  GetTrainer: (id?: string | number) => UseQueryResult<TrainerInfo>;
  GetTrainerAssignment: (
    args?: QueryArgs,
  ) => UseQueryResult<TrainerAssignment | null>;
  RequestTrainer: () => UseMutationResult<void, Error, RequestTrainerPayload>;
  CancelTrainerAssignment: () => UseMutationResult<void, Error, void>;
  GetTrainerReviews: (trainerId?: number) => UseQueryResult<ReviewStats>;
  SubmitTrainerReview: (
    trainerId?: number,
  ) => UseMutationResult<void, Error, ReviewPayload>;
  DeleteTrainerReview: (
    trainerId?: number,
  ) => UseMutationResult<void, Error, void>;
  GetOrders: (args?: QueryArgs) => UseQueryResult<PaginatedResponse<Order>>;
  CreateOrder: () => UseMutationResult<Order, Error, CreateOrderPayload>;
  CancelOrder: () => UseMutationResult<void, Error, number>;
  GetProductRequests: (
    args?: QueryArgs,
  ) => UseQueryResult<PaginatedResponse<ProductRequest>>;
  CreateProductRequest: () => UseMutationResult<
    ProductRequest,
    Error,
    CreateProductRequestPayload
  >;
  GetExercises: (args?: QueryArgs) => UseQueryResult<Exercise[]>;
  GetExerciseLogs: (
    args?: QueryArgs,
  ) => UseQueryResult<PaginatedResponse<ExerciseLog>>;
  LogExercise: () => UseMutationResult<ExerciseLog, Error, LogExercisePayload>;
  DeleteExerciseLog: () => UseMutationResult<void, Error, number>;
  GetAuthProfile: (args?: QueryArgs) => UseQueryResult<import("@/types").User>;
  UpdateAvatar: () => UseMutationResult<void, Error, string>;
}

const useUser = (): UseUserReturn => {
  const { api, get: GetTrainers } = useApi({
    endpoint: endpoint.userTrainers,
    queryKey: "trainers",
  });
  const { get: GetAuthProfile } = useApi({
    endpoint: endpoint.authProfile,
    queryKey: "authProfile",
  });

  const { get: GetTrainerAssignment, post: RequestTrainer } = useApi({
    endpoint: endpoint.userTrainerAssignment,
    queryKey: "trainerAssignment",
  });

  const {
    get: GetOrders,
    post: CreateOrder,
    delete: CancelOrder,
  } = useApi({ endpoint: endpoint.userOrders, queryKey: "userOrders" });

  const { get: GetProductRequests, post: CreateProductRequest } = useApi({
    endpoint: endpoint.userProductRequests,
    queryKey: "userProductRequests",
  });

  const { get: GetExercises } = useApi({
    endpoint: endpoint.userExercises,
    queryKey: "userExercises",
  });

  const {
    get: GetExerciseLogs,
    post: LogExercise,
    delete: DeleteExerciseLog,
  } = useApi({
    endpoint: endpoint.userExerciseLogs,
    queryKey: "userExerciseLogs",
  });

  const GetTrainer = (id?: string | number) =>
    useQuery({
      queryKey: ["trainer", id],
      queryFn: async () => {
        const { data } = await api.get(`${endpoint.userTrainers}/${id}`);
        return data;
      },
      enabled: !!id,
      retry: (failureCount: number, error: any) => {
        if (error?.response?.status === 404) return false;
        return failureCount < 1;
      },
    });

  const GetTrainerReviews = (trainerId?: number) =>
    useQuery({
      queryKey: ["trainerReviews", trainerId],
      queryFn: async () => {
        const { data } = await api.get(
          `${endpoint.userTrainers}/${trainerId}/reviews`,
        );
        return data;
      },
      enabled: !!trainerId,
    });

  const SubmitTrainerReview = (trainerId?: number) =>
    useMutation({
      mutationFn: async (reviewData: {
        rating: number;
        comment?: string | null;
      }) => {
        const { data } = await api.post(
          `${endpoint.userTrainers}/${trainerId}/reviews`,
          reviewData,
        );
        return data;
      },
    });

  const DeleteTrainerReview = (trainerId?: number) =>
    useMutation({
      mutationFn: async () => {
        const { data } = await api.delete(
          `${endpoint.userTrainers}/${trainerId}/reviews`,
        );
        return data;
      },
    });

  const CancelTrainerAssignment = () =>
    useMutation({
      mutationFn: async () => {
        const { data } = await api.delete(endpoint.userTrainerAssignment);
        return data;
      },
    });

  const UpdateAvatar = () =>
    useMutation({
      mutationFn: async (profileImageUrl: string) => {
        const { data } = await api.put("auth/avatar", {
          profile_image_url: profileImageUrl,
        });
        return data;
      },
    });

  return {
    GetTrainers,
    GetTrainer,
    GetTrainerAssignment,
    RequestTrainer,
    CancelTrainerAssignment,
    GetTrainerReviews,
    SubmitTrainerReview,
    DeleteTrainerReview,
    GetOrders,
    CreateOrder,
    CancelOrder,
    GetProductRequests,
    CreateProductRequest,
    GetExercises,
    GetExerciseLogs,
    LogExercise,
    DeleteExerciseLog,
    GetAuthProfile,
    UpdateAvatar,
  } as UseUserReturn;
};

export default useUser;
