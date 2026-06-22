import { useState } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems?: number;
}

export interface UsePaginationReturn {
  page: number;
  pageSize: number;
  // totalPages: number;
  offset: number;
  goToPage: (p: number) => void;
  setPageSize: (size: number) => void;
  resetPage: () => void;
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 10,
  // totalItems = 0,
}: UsePaginationOptions = {}): UsePaginationReturn {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  // const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const goToPage = (page: number) => {
    // const clamped = Math.min(Math.max(1, p), totalPages);
    setPage(page);
  };

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  const resetPage = () => setPage(1);

  return {
    page,
    pageSize,
    // totalPages,
    offset: (page - 1) * pageSize,
    goToPage,
    setPageSize,
    resetPage,
  };
}
