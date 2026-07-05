import { QueryClient } from "@tanstack/react-query";

// Single shared instance — imported both by main.tsx (to back the
// QueryClientProvider) and by non-React modules like chatStore.ts that need
// to invalidate queries from outside the component tree (e.g. socket events).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
