import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface AppPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function buildPageNumbers(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 4)        return [1, 2, 3, 4, 5, "…", total];
  if (page >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", page - 1, page, page + 1, "…", total];
}

export function AppPagination({ page, totalPages, onPageChange }: AppPaginationProps) {
  if (totalPages <= 1) return null;

  const isFirst = page === 1;
  const isLast  = page === totalPages;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={isFirst}
            className={isFirst ? "pointer-events-none opacity-50" : ""}
            onClick={(e) => { e.preventDefault(); if (!isFirst) onPageChange(page - 1); }}
          />
        </PaginationItem>

        {buildPageNumbers(page, totalPages).map((n, i) =>
          n === "…" ? (
            <PaginationItem key={`ellipsis-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={n}>
              <PaginationLink
                href="#"
                isActive={n === page}
                onClick={(e) => { e.preventDefault(); onPageChange(n as number); }}
              >
                {n}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            aria-disabled={isLast}
            className={isLast ? "pointer-events-none opacity-50" : ""}
            onClick={(e) => { e.preventDefault(); if (!isLast) onPageChange(page + 1); }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
