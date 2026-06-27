import { endpoint } from "@/api/endpoint.ts";
import { useApi } from "./useApi";
import type { UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import type { QueryArgs } from "@/interfaces/iUseApi";
import type { Category } from "@/types";

interface UseProductCategoryReturn {
  GetCategories: (args?: QueryArgs) => UseQueryResult<Category[]>;
  CreateCategory: () => UseMutationResult<Category, Error, Omit<Category, "id">>;
  UpdateCategory: () => UseMutationResult<Category, Error, Partial<Category> & { id: number }>;
  DeleteCategory: () => UseMutationResult<void, Error, number>;
}

const useProductCategory = (): UseProductCategoryReturn => {
  const { get: GetCategories } = useApi({
    endpoint: endpoint.categories,
    queryKey: "allCategories",
  });

  const { post: CreateCategory } = useApi({
    endpoint: endpoint.categories,
    queryKey: "createCategory",
  });
  const { update: UpdateCategory } = useApi({
    endpoint: endpoint.categories,
    queryKey: "updateCategory",
  });
  const { delete: DeleteCategory } = useApi({
    endpoint: endpoint.categories,
    queryKey: "deleteCategory",
  });
  return {
    GetCategories,
    CreateCategory,
    UpdateCategory,
    DeleteCategory,
  } as UseProductCategoryReturn;
};

export default useProductCategory;
