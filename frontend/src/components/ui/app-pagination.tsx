import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

type AppPaginationProps = {
  page: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
} & (
  | { totalPages: number; total?: never }
  | { total: number; totalPages?: never }
);

function buildPageNumbers(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (page >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", page - 1, page, page + 1, "…", total];
}

export function AppPagination({
  page,
  onPageChange,
  pageSize,
  onPageSizeChange,
  ...rest
}: AppPaginationProps) {
  const resolvedTotalPages =
    "totalPages" in rest && rest.totalPages !== undefined
      ? rest.totalPages
      : Math.max(1, Math.ceil((rest.total ?? 0) / (pageSize ?? 10)));

  const totalPages = resolvedTotalPages;
  const showSizeSelector =
    pageSize !== undefined && onPageSizeChange !== undefined;

  if (totalPages <= 1 && !showSizeSelector) return null;

  const isFirst = page === 1;
  const isLast = page === totalPages;

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {showSizeSelector && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              onPageSizeChange(Number(v));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {totalPages && (
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={isFirst}
                className={isFirst ? "pointer-events-none opacity-50" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isFirst) onPageChange(page - 1);
                }}
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
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(n as number);
                    }}
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
                onClick={(e) => {
                  e.preventDefault();
                  if (!isLast) onPageChange(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
