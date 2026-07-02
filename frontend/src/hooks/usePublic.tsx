import { useQuery, useMutation, UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import { endpoint } from "@/api/endpoint.ts";
import { useApi } from "./useApi";
import type { QueryArgs } from "@/interfaces/iUseApi";
import type {
  Product,
  Category,
  ReviewStats,
  PaginatedResponse,
  ReviewPayload,
  TrainerInfo,
  PublicBecomeTrainerPayload,
  BecomeTrainerResult,
} from "@/types";

interface UsePublicReturn {
  GetProducts: (args?: QueryArgs) => UseQueryResult<PaginatedResponse<Product>>;
  GetProduct: (id?: string) => UseQueryResult<Product>;
  GetCategories: (args?: QueryArgs) => UseQueryResult<Category[]>;
  GetTrainers: (args?: QueryArgs) => UseQueryResult<TrainerInfo[]>;
  GetProductReviews: (productId?: string | number) => UseQueryResult<ReviewStats>;
  SubmitProductReview: (productId?: string | number) => UseMutationResult<void, Error, ReviewPayload>;
  DeleteProductReview: (productId?: string | number) => UseMutationResult<void, Error, void>;
  BecomeTrainer: () => UseMutationResult<BecomeTrainerResult, Error, PublicBecomeTrainerPayload>;
}

const usePublic = (): UsePublicReturn => {
  const { api, get: GetProducts } = useApi({ endpoint: endpoint.publicProducts, queryKey: "publicProducts" });

  const { get: GetCategories } = useApi({ endpoint: endpoint.publicCategories, queryKey: "publicCategories" });

  const { get: GetTrainers } = useApi({ endpoint: endpoint.publicTrainers, queryKey: "publicTrainers" });

  const GetProduct = (id?: string) =>
    useQuery({
      queryKey: ["product", id],
      queryFn: async () => {
        const { data } = await api.get(`${endpoint.publicProducts}/${id}`);
        return data;
      },
      enabled: !!id,
      retry: (failureCount: number, error: any) => {
        if (error?.response?.status === 404) return false;
        return failureCount < 1;
      },
    });

  const GetProductReviews = (productId?: string | number) =>
    useQuery({
      queryKey: ["productReviews", String(productId)],
      queryFn: async () => {
        const { data } = await api.get(`${endpoint.publicProducts}/${productId}/reviews`);
        return data;
      },
      enabled: !!productId,
    });

  const SubmitProductReview = (productId?: string | number) =>
    useMutation({
      mutationFn: async (reviewData: { rating: number; comment?: string | null }) => {
        const { data } = await api.post(`user/products/${productId}/reviews`, reviewData);
        return data;
      },
    });

  const DeleteProductReview = (productId?: string | number) =>
    useMutation({
      mutationFn: async () => {
        const { data } = await api.delete(`user/products/${productId}/reviews`);
        return data;
      },
    });

  const BecomeTrainer = () =>
    useMutation({
      mutationFn: async (payload: PublicBecomeTrainerPayload) => {
        const { data } = await api.post(endpoint.publicBecomeTrainer, payload);
        return data as BecomeTrainerResult;
      },
    });

  return {
    GetProducts, GetProduct,
    GetCategories, GetTrainers,
    GetProductReviews, SubmitProductReview, DeleteProductReview,
    BecomeTrainer,
  } as UsePublicReturn;
};

export default usePublic;
