import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  largeCol?: number[];
}

export function TableSkeleton({ rows = 8, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, index) => (
              <TableHead key={index}>
                <Skeleton className="h-4 w-24" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBodySkeleton rows={rows} columns={columns} />
      </Table>
    </div>
  );
}

export function TableBodySkeleton({
  rows = 8,
  columns = 6,
  largeCol = [0],
}: TableSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, row) => (
        <TableRow key={row}>
          {Array.from({ length: columns }).map((_, col) => (
            <TableCell key={col}>
              <Skeleton
                className={`h-4 ${
                  largeCol?.includes(col)
                    ? "w-40"
                    : col === columns - 1
                      ? "w-20"
                      : "w-full"
                }`}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}
