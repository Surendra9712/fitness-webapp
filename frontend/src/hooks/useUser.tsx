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
  PromoValidateResult,
  PointsData,
  GlobalDiscount,
  PaginatedResponse,
  Notification,
  CreateOrderPayload,
  CreateProductRequestPayload,
  LogExercisePayload,
  ReviewPayload,
  RequestTrainerPayload,
} from "@/types";

interface UseUserReturn {
  GetNotifications: (args?: QueryArgs) => UseQueryResult<PaginatedResponse<Notification>>;
  GetUnreadCount: () => UseQueryResult<{ count: number }>;
  MarkRead: () => UseMutationResult<void, Error, number>;
  MarkAllRead: () => UseMutationResult<void, Error, void>;
  DeleteNotification: () => UseMutationResult<void, Error, number>;
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
  GetSubscription: (args?: QueryArgs) => UseQueryResult<{ subscription_plan: import("@/types").SubscriptionPlan; subscription_status: import("@/types").SubscriptionStatus }>;
  UpdateSubscription: () => UseMutationResult<
    { subscription_plan?: import("@/types").SubscriptionPlan; subscription_status?: import("@/types").SubscriptionStatus; payment_method?: string; esewa_url?: string; esewa_params?: import("@/types").EsewaParams },
    Error,
    { plan: import("@/types").SubscriptionPlan; method?: import("@/types").SubscriptionPaymentMethod }
  >;
  ValidatePromo: () => UseMutationResult<PromoValidateResult, Error, { code: string; order_total: number }>;
  GetPoints: (args?: QueryArgs) => UseQueryResult<PointsData>;
  GetAvailablePromos: (args?: QueryArgs) => UseQueryResult<import("@/types").PromoCode[]>;
  GetGlobalDiscount: (args?: QueryArgs) => UseQueryResult<GlobalDiscount>;
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

  const { get: GetSubscription } = useApi({
    endpoint: endpoint.userSubscription,
    queryKey: "userSubscription",
  });

  const UpdateSubscription = () =>
    useMutation({
      mutationFn: async ({ plan, method }: { plan: import("@/types").SubscriptionPlan; method?: import("@/types").SubscriptionPaymentMethod }) => {
        const { data } = await api.put(endpoint.userSubscription, { plan, method });
        return data;
      },
    });

  const ValidatePromo = () =>
    useMutation({
      mutationFn: async ({ code, order_total }: { code: string; order_total: number }) => {
        const { data } = await api.post(endpoint.userPromoValidate, { code, order_total });
        return data as PromoValidateResult;
      },
    });

  const { get: GetPoints } = useApi({
    endpoint: endpoint.userPoints,
    queryKey: "userPoints",
  });

  const { get: GetAvailablePromos } = useApi({
    endpoint: endpoint.userPromoAvailable,
    queryKey: "userAvailablePromos",
  });

  const { get: GetGlobalDiscount } = useApi({
    endpoint: endpoint.publicGlobalDiscount,
    queryKey: "publicGlobalDiscount",
  });

  const { get: GetNotifications } = useApi({
    endpoint: endpoint.notifications,
    queryKey: "notifications",
  });

  const GetUnreadCount = () =>
    useQuery({
      queryKey: ["notificationsUnreadCount"],
      queryFn: async () => {
        const { data } = await api.get(endpoint.notificationsUnreadCount);
        return data as { count: number };
      },
      refetchInterval: 30000,
    });

  const MarkRead = () =>
    useMutation({
      mutationFn: async (id: number) => {
        const { data } = await api.put(`${endpoint.notifications}/${id}/read`, {});
        return data;
      },
    });

  const MarkAllRead = () =>
    useMutation({
      mutationFn: async () => {
        const { data } = await api.put(`${endpoint.notifications}/read-all`, {});
        return data;
      },
    });

  const DeleteNotification = () =>
    useMutation({
      mutationFn: async (id: number) => {
        const { data } = await api.delete(`${endpoint.notifications}/${id}`);
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
    GetSubscription,
    UpdateSubscription,
    ValidatePromo,
    GetPoints,
    GetAvailablePromos,
    GetGlobalDiscount,
    GetNotifications,
    GetUnreadCount,
    MarkRead,
    MarkAllRead,
    DeleteNotification,
  } as UseUserReturn;
};

export default useUser;
