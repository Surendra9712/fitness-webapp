import { useQuery, useMutation } from "@tanstack/react-query";
import { endpoint } from "@/api/endpoint.ts";
import { useApi } from "./useApi";

const useUser = (): any => {
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
  };
};

export default useUser;
