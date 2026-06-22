import { useQuery, useMutation } from "@tanstack/react-query";
import { endpoint } from "@/api/endpoint.ts";
import { useApi } from "./useApi";

const usePublic = (): any => {
  const { api, get: GetProducts } = useApi({ endpoint: endpoint.publicProducts, queryKey: "publicProducts" });

  const { get: GetCategories } = useApi({ endpoint: endpoint.publicCategories, queryKey: "publicCategories" });

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

  return {
    GetProducts, GetProduct,
    GetCategories,
    GetProductReviews, SubmitProductReview, DeleteProductReview,
  };
};

export default usePublic;
