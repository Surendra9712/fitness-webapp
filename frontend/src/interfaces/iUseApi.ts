import { Query, QueryKey } from "@tanstack/react-query";

export interface IUseApi {
  queryKey?: string;
  endpoint: string;
  includeParamsInUrl?: boolean;
  enabled?: boolean | ((args: any) => boolean);
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?:
    | boolean
    | "always"
    | ((query: Query<any, Error, any, QueryKey>) => boolean | "always")
    | undefined;
  refetchInterval?:
    | number
    | false
    | ((query: Query<any, Error, any, QueryKey>) => number | false | undefined)
    | undefined;
}

export interface QueryArgs {
  queryParams?: Record<string, any>; // Object holding any query parameters
  id?: number; // Object holding any query parameters
}
