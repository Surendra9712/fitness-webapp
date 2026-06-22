import { endpoint } from "@/api/endpoint.ts";
import { useApi } from "./useApi";

const useProductCategory = (): any => {
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
  };
};

export default useProductCategory;
