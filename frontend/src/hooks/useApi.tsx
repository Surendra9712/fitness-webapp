import {
  useQuery,
  useMutation,
  MutationKey,
  keepPreviousData,
} from "@tanstack/react-query";
import { AxiosRequestConfig } from "axios";
import useAxios from "./useAxios";
import { IUseApi, QueryArgs } from "@/interfaces/iUseApi";

export async function fetchApiData(
  api: ReturnType<typeof useAxios>,
  endpoint: string,
  args?: QueryArgs,
) {
  const url = args?.id ? `${endpoint}/${args.id}` : endpoint;
  const config: AxiosRequestConfig = { params: args?.queryParams };
  const { data } = await api.get(url, config);
  return data;
}

export function useApi({
  endpoint,
  enabled = true,
  staleTime,
  cacheTime,
  refetchInterval = false,
  refetchOnWindowFocus = false,
  queryKey,
}: IUseApi) {
  const api = useAxios();
  const useQueryHelper = (args?: QueryArgs) => {
    return useQuery({
      queryKey: args?.id
        ? [queryKey, endpoint, args.id, args]
        : [queryKey, endpoint, args],
      queryFn: () => fetchApiData(api, endpoint, args),
      enabled: typeof enabled === "function" ? enabled(args) : enabled,
      staleTime,
      gcTime: cacheTime,
      retry: 3,
      refetchInterval,
      refetchOnWindowFocus,
      placeholderData: keepPreviousData,
    });
  };

  const useMutationHelper = () => {
    return useMutation({
      mutationKey: [endpoint] as MutationKey,
      mutationFn: async (postData: any) => {
        const { data } = await api.post(endpoint, postData);
        return data;
      },
    });
  };

  const useUpdateHelper = () => {
    return useMutation({
      mutationKey: [endpoint, "update"] as MutationKey,
      mutationFn: async (postData: any) => {
        const url = postData?.id ? `${endpoint}/${postData.id}` : endpoint;
        const { data } = await api.put(url, postData);
        return data;
      },
    });
  };

  const useDeleteHelper = () => {
    return useMutation({
      mutationKey: [endpoint, "delete"] as MutationKey,
      mutationFn: async (id: number) => {
        const url = `${endpoint}/${id}`;
        const { data } = await api.delete(url);
        return data;
      },
    });
  };

  return {
    api,
    get: useQueryHelper,
    post: useMutationHelper,
    update: useUpdateHelper,
    delete: useDeleteHelper,
  };
}
