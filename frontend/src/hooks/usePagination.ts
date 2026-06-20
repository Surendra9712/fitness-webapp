import { useState } from "react";

export interface UsePaginationReturn {
  page: number;
  goToPage: (p: number) => void;
  resetPage: () => void;
}

export function usePagination(initialPage = 1): UsePaginationReturn {
  const [page, setPage] = useState(initialPage);

  const goToPage = (p: number) => setPage(p);
  const resetPage = () => setPage(1);

  return { page, goToPage, resetPage };
}
