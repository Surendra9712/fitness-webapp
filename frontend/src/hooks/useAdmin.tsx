import {
  useMutation,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import { endpoint } from "@/api/endpoint.ts";
import { useApi } from "./useApi";
import type { QueryArgs } from "@/interfaces/iUseApi";
import type {
  AdminStats,
  AdminStatsTrends,
  User,
  Exercise,
  Category,
  Product,
  Order,
  TrainerAssignment,
  ProductRequest,
  PromoCode,
  GlobalDiscount,
  PaginatedResponse,
  CreateUserPayload,
  UpdateUserPayload,
  UpdateOrderStatusPayload,
  AssignmentActionPayload,
  ApproveProductRequestPayload,
} from "@/types";

interface UseAdminReturn {
  GetStats: (args?: QueryArgs) => UseQueryResult<AdminStats>;
  GetStatsTrends: (args?: QueryArgs) => UseQueryResult<AdminStatsTrends>;
  GetUsers: (args?: QueryArgs) => UseQueryResult<PaginatedResponse<User>>;
  GetUserDetail: (args?: QueryArgs) => UseQueryResult<User>;
  CreateUser: () => UseMutationResult<User, Error, CreateUserPayload>;
  UpdateUser: () => UseMutationResult<User, Error, UpdateUserPayload>;
  DeleteUser: () => UseMutationResult<void, Error, number>;
  GetCategories: (
    args?: QueryArgs,
  ) => UseQueryResult<PaginatedResponse<Category>>;
  CreateCategory: () => UseMutationResult<
    Category,
    Error,
    Omit<Category, "id">
  >;
  UpdateCategory: () => UseMutationResult<
    Category,
    Error,
    Partial<Category> & { id: number }
  >;
  DeleteCategory: () => UseMutationResult<void, Error, number>;
  GetExercises: (
    args?: QueryArgs,
  ) => UseQueryResult<PaginatedResponse<Exercise>>;
  CreateExercise: () => UseMutationResult<
    Exercise,
    Error,
    Omit<Exercise, "id">
  >;
  UpdateExercise: () => UseMutationResult<
    Exercise,
    Error,
    Partial<Exercise> & { id: number }
  >;
  DeleteExercise: () => UseMutationResult<void, Error, number>;
  GetProducts: (args?: QueryArgs) => UseQueryResult<PaginatedResponse<Product>>;
  CreateProduct: () => UseMutationResult<Product, Error, Omit<Product, "id">>;
  UpdateProduct: () => UseMutationResult<
    Product,
    Error,
    Partial<Product> & { id: number }
  >;
  DeleteProduct: () => UseMutationResult<void, Error, number>;
  GetOrders: (args?: QueryArgs) => UseQueryResult<PaginatedResponse<Order>>;
  DeleteOrder: () => UseMutationResult<void, Error, number>;
  UpdateOrderStatus: () => UseMutationResult<
    Order,
    Error,
    UpdateOrderStatusPayload
  >;
  GetTrainerAssignments: (
    args?: QueryArgs,
  ) => UseQueryResult<PaginatedResponse<TrainerAssignment>>;
  ApproveTrainerAssignment: () => UseMutationResult<
    void,
    Error,
    AssignmentActionPayload
  >;
  RejectTrainerAssignment: () => UseMutationResult<
    void,
    Error,
    AssignmentActionPayload
  >;
  GetProductRequests: (
    args?: QueryArgs,
  ) => UseQueryResult<PaginatedResponse<ProductRequest>>;
  ApproveProductRequest: () => UseMutationResult<
    void,
    Error,
    ApproveProductRequestPayload
  >;
  RejectProductRequest: () => UseMutationResult<
    void,
    Error,
    AssignmentActionPayload
  >;
  VerifyTrainer: () => UseMutationResult<{ is_verified: boolean }, Error, number>;
  GetSubscriptions: (args?: QueryArgs) => UseQueryResult<PaginatedResponse<User>>;
  ApproveSubscription: () => UseMutationResult<void, Error, number>;
  RejectSubscription: () => UseMutationResult<void, Error, { id: number; admin_note: string }>;
  GetPromoCodes: (args?: QueryArgs) => UseQueryResult<PaginatedResponse<PromoCode>>;
  CreatePromoCode: () => UseMutationResult<PromoCode, Error, Omit<PromoCode, 'id' | 'current_uses' | 'created_at'>>;
  UpdatePromoCode: () => UseMutationResult<PromoCode, Error, Partial<PromoCode> & { id: number }>;
  DeletePromoCode: () => UseMutationResult<void, Error, number>;
  GetGlobalDiscount: (args?: QueryArgs) => UseQueryResult<GlobalDiscount>;
  UpdateGlobalDiscount: () => UseMutationResult<GlobalDiscount, Error, GlobalDiscount>;
  SetProductDiscount: () => UseMutationResult<void, Error, { id: number; discount_type: string; discount_value: number; valid_from?: string | null; valid_to?: string | null }>;
  ClearProductDiscount: () => UseMutationResult<void, Error, number>;
}

const useAdmin = (): UseAdminReturn => {
  const { api, get: GetStats } = useApi({
    endpoint: endpoint.adminStats,
    queryKey: "adminStats",
  });

  const { get: GetStatsTrends } = useApi({
    endpoint: endpoint.adminStatsTrends,
    queryKey: "adminStatsTrends",
  });

  const {
    get: GetUsers,
    get: GetUserDetail,
    post: CreateUser,
    update: UpdateUser,
    delete: DeleteUser,
  } = useApi({ endpoint: endpoint.adminUsers, queryKey: "adminUsers" });

  const {
    get: GetExercises,
    post: CreateExercise,
    update: UpdateExercise,
    delete: DeleteExercise,
  } = useApi({ endpoint: endpoint.adminExercises, queryKey: "adminExercises" });

  const {
    get: GetCategories,
    post: CreateCategory,
    update: UpdateCategory,
    delete: DeleteCategory,
  } = useApi({ endpoint: endpoint.categories, queryKey: "adminCategories" });

  const {
    get: GetProducts,
    post: CreateProduct,
    update: UpdateProduct,
    delete: DeleteProduct,
  } = useApi({ endpoint: endpoint.adminProducts, queryKey: "adminProducts" });

  const { get: GetOrders, delete: DeleteOrder } = useApi({
    endpoint: endpoint.adminOrders,
    queryKey: "adminOrders",
  });

  const { get: GetTrainerAssignments } = useApi({
    endpoint: endpoint.adminTrainerAssignments,
    queryKey: "adminTrainerAssignments",
  });

  const { get: GetProductRequests } = useApi({
    endpoint: endpoint.adminProductRequests,
    queryKey: "adminProductRequests",
  });

  const UpdateOrderStatus = () =>
    useMutation({
      mutationFn: async ({
        orderId,
        status,
      }: {
        orderId: number;
        status: string;
      }) => {
        const { data } = await api.put(
          `${endpoint.adminOrders}/${orderId}/status`,
          { status },
        );
        return data;
      },
    });

  const ApproveTrainerAssignment = () =>
    useMutation({
      mutationFn: async ({
        id,
        admin_note,
      }: {
        id: number;
        admin_note?: string;
      }) => {
        const { data } = await api.put(
          `${endpoint.adminTrainerAssignments}/${id}/approve`,
          { admin_note },
        );
        return data;
      },
    });

  const RejectTrainerAssignment = () =>
    useMutation({
      mutationFn: async ({
        id,
        admin_note,
      }: {
        id: number;
        admin_note?: string;
      }) => {
        const { data } = await api.put(
          `${endpoint.adminTrainerAssignments}/${id}/reject`,
          { admin_note },
        );
        return data;
      },
    });

  const ApproveProductRequest = () =>
    useMutation({
      mutationFn: async ({
        id,
        ...rest
      }: {
        id: number;
        price: number;
        stock_quantity: number;
        category: string;
        admin_note?: string;
      }) => {
        const { data } = await api.put(
          `${endpoint.adminProductRequests}/${id}/approve`,
          rest,
        );
        return data;
      },
    });

  const RejectProductRequest = () =>
    useMutation({
      mutationFn: async ({
        id,
        admin_note,
      }: {
        id: number;
        admin_note?: string;
      }) => {
        const { data } = await api.put(
          `${endpoint.adminProductRequests}/${id}/reject`,
          { admin_note },
        );
        return data;
      },
    });

  const VerifyTrainer = () =>
    useMutation({
      mutationFn: async (uid: number) => {
        const { data } = await api.put(`${endpoint.adminUsers}/${uid}/verify`);
        return data as { is_verified: boolean };
      },
    });

  const { get: GetSubscriptions } = useApi({
    endpoint: endpoint.adminSubscriptions,
    queryKey: "adminSubscriptions",
  });

  const ApproveSubscription = () =>
    useMutation({
      mutationFn: async (uid: number) => {
        await api.put(`${endpoint.adminSubscriptions}/${uid}/approve`);
      },
    });

  const RejectSubscription = () =>
    useMutation({
      mutationFn: async ({ id, admin_note }: { id: number; admin_note: string }) => {
        await api.put(`${endpoint.adminSubscriptions}/${id}/reject`, { admin_note });
      },
    });

  const {
    get: GetPromoCodes,
    post: CreatePromoCode,
    update: UpdatePromoCode,
    delete: DeletePromoCode,
  } = useApi({ endpoint: endpoint.adminPromoCodes, queryKey: "adminPromoCodes" });

  const { get: GetGlobalDiscount } = useApi({
    endpoint: endpoint.adminGlobalDiscount,
    queryKey: "adminGlobalDiscount",
  });

  const UpdateGlobalDiscount = () =>
    useMutation({
      mutationFn: async (body: GlobalDiscount) => {
        const { data } = await api.put(endpoint.adminGlobalDiscount, body);
        return data as GlobalDiscount;
      },
    });

  const SetProductDiscount = () =>
    useMutation({
      mutationFn: async ({ id, ...body }: { id: number; discount_type: string; discount_value: number; valid_from?: string | null; valid_to?: string | null }) => {
        await api.put(`${endpoint.adminProducts}/${id}/discount`, body);
      },
    });

  const ClearProductDiscount = () =>
    useMutation({
      mutationFn: async (id: number) => {
        await api.delete(`${endpoint.adminProducts}/${id}/discount`);
      },
    });

  return {
    GetStats,
    GetStatsTrends,
    GetUsers,
    GetUserDetail,
    CreateUser,
    UpdateUser,
    DeleteUser,
    GetCategories,
    CreateCategory,
    UpdateCategory,
    DeleteCategory,
    GetExercises,
    CreateExercise,
    UpdateExercise,
    DeleteExercise,
    GetProducts,
    CreateProduct,
    UpdateProduct,
    DeleteProduct,
    GetOrders,
    DeleteOrder,
    UpdateOrderStatus,
    GetTrainerAssignments,
    ApproveTrainerAssignment,
    RejectTrainerAssignment,
    GetProductRequests,
    ApproveProductRequest,
    RejectProductRequest,
    VerifyTrainer,
    GetSubscriptions,
    ApproveSubscription,
    RejectSubscription,
    GetPromoCodes,
    CreatePromoCode,
    UpdatePromoCode,
    DeletePromoCode,
    GetGlobalDiscount,
    UpdateGlobalDiscount,
    SetProductDiscount,
    ClearProductDiscount,
  } as UseAdminReturn;
};

export default useAdmin;
