import { useState } from "react";
import { CheckCircle, XCircle, UserCheck } from "lucide-react";
import useDietitian from "@/hooks/useDietitian";
import { usePagination } from "@/hooks/usePagination";
import { AppPagination } from "@/components/ui/app-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TrainerAssignment } from "@/types";
import { TrainerRequestDialog } from "./TrainerRequestDialog";
import { TraineeDetailDialog } from "./TraineeDetailDialog";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_BADGE: Record<string, string> = {
  pending_trainer: "bg-yellow-100 text-yellow-800 border-yellow-200",
  pending_admin: "bg-blue-100 text-blue-800 border-blue-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  ended: "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_LABEL: Record<string, string> = {
  pending_trainer: "Awaiting You",
  pending_admin: "Awaiting Admin",
  approved: "Approved",
  rejected: "Rejected",
  ended: "Unassigned by Admin",
};

export default function AssignmentRequests() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("pending_trainer");
  const [approveTarget, setApproveTarget] = useState<TrainerAssignment | null>(
    null,
  );
  // The row whose trainee profile is open. Held as the whole assignment so the
  // dialog can show its status/note/date without re-fetching them.
  const [viewTrainee, setViewTrainee] = useState<TrainerAssignment | null>(
    null,
  );

  const { page, pageSize, goToPage, setPageSize, resetPage } = usePagination({
    initialPageSize: 20,
  });

  const { GetAssignmentRequests } = useDietitian();
  const { data, isPlaceholderData } = GetAssignmentRequests({
    queryParams: { status: filter, page, page_size: pageSize },
  });
  const assignments = data?.items ?? [];
  const total = data?.total ?? 0;

  function handleFilterChange(value: string) {
    setFilter(value);
    resetPage();
  }

  const handleRequest = async () => {
    setApproveTarget(null);
    queryClient.invalidateQueries({
      queryKey: ["dietitianAssignmentRequests"],
    });
  };
  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <Select value={filter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending_trainer">Pending (You)</SelectItem>
            <SelectItem value="pending_admin">Pending Admin</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="ended">Unassigned</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className={isPlaceholderData ? "opacity-70" : ""}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-36" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer"
                  title="View trainee profile"
                  onClick={() => setViewTrainee(a)}
                >
                  <TableCell>
                    <div className="font-medium">{a.customer_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.customer_email}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {a.customer_note ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGE[a.status] ?? ""}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </Badge>
                  </TableCell>
                  {/* Actions live inside a clickable row — stop the click here
                      so approving doesn't also open the profile dialog. */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {a.status === "pending_trainer" && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => {
                            setApproveTarget({
                              ...a,
                              isApprovedByTrainer: true,
                            });
                          }}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-destructive text-destructive hover:bg-red-50"
                          onClick={() => {
                            setApproveTarget({
                              ...a,
                              isApprovedByTrainer: false,
                            });
                          }}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!assignments.length && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <UserCheck className="mx-auto mb-2 h-10 w-10 opacity-30" />
                    No requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AppPagination
        page={page}
        total={total}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onPageChange={goToPage}
      />

      <TrainerRequestDialog
        request={approveTarget}
        onClose={() => setApproveTarget(null)}
        onSuccess={handleRequest}
      />

      {viewTrainee && (
        <TraineeDetailDialog
          assignment={viewTrainee}
          onClose={() => setViewTrainee(null)}
        />
      )}
    </div>
  );
}
