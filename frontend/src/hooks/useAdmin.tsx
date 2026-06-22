import { useMutation } from "@tanstack/react-query";
import { endpoint } from "@/api/endpoint.ts";
import { useApi } from "./useApi";

const useAdmin = (): any => {
  const { api, get: GetStats } = useApi({
    endpoint: endpoint.adminStats,
    queryKey: "adminStats",
  });

  const {
    get: GetUsers,
    post: CreateUser,
    update: UpdateUser,
    delete: DeleteUser,
  } = useApi({ endpoint: endpoint.adminUsers, queryKey: "adminUsers" });

  const {
    get: GetExercises,
    post: CreateExercise,
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

  return {
    GetStats,
    GetUsers,
    CreateUser,
    UpdateUser,
    DeleteUser,
    GetCategories,
    CreateCategory,
    UpdateCategory,
    DeleteCategory,
    GetExercises,
    CreateExercise,
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
  };
};

export default useAdmin;
