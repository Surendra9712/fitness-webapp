import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  UserCheck,
  MoreHorizontal,
  UserMinus,
} from "lucide-react";
import useAdmin from "@/hooks/useAdmin";
import { usePagination } from "@/hooks/usePagination";
import { AppPagination } from "@/components/ui/app-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { AdminAssignmentAction, TrainerAssignment } from "@/types";
import { TableBodySkeleton } from "@/components/TableSkeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_BADGE: Record<string, string> = {
  pending_trainer: "bg-yellow-100 text-yellow-800 border-yellow-200",
  pending_admin: "bg-blue-100 text-blue-800 border-blue-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  ended: "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_LABEL: Record<string, string> = {
  pending_trainer: "Awaiting Trainer",
  pending_admin: "Awaiting Admin",
  approved: "Approved",
  rejected: "Rejected",
  ended: "Unassigned",
};

/** Per-action copy for the shared confirmation dialog. */
const ACTION_META: Record<
  AdminAssignmentAction,
  {
    title: string;
    confirmLabel: string;
    pendingLabel: string;
    destructive: boolean;
    noteLabel: string;
    notePlaceholder: string;
    description: (a: TrainerAssignment) => React.ReactNode;
    toast: (a: TrainerAssignment) => string;
  }
> = {
  approved: {
    title: "Approve Assignment",
    confirmLabel: "Approve",
    pendingLabel: "Approving…",
    destructive: false,
    noteLabel: "Admin note (optional)",
    notePlaceholder: "e.g. Approved — good match",
    description: (a) => (
      <>
        Assigning <strong>{a.customer_name}</strong> to trainer{" "}
        <strong>{a.trainer_name}</strong>.
      </>
    ),
    toast: () => "Assignment approved",
  },
  rejected: {
    title: "Reject Assignment",
    confirmLabel: "Reject",
    pendingLabel: "Rejecting…",
    destructive: true,
    noteLabel: "Reason (optional)",
    notePlaceholder: "e.g. Trainer at capacity",
    description: (a) => (
      <>
        Rejecting assignment of <strong>{a.customer_name}</strong> to{" "}
        <strong>{a.trainer_name}</strong>.
      </>
    ),
    toast: () => "Assignment rejected",
  },
  ended: {
    title: "Unassign Trainer",
    confirmLabel: "Unassign",
    pendingLabel: "Unassigning…",
    destructive: true,
    noteLabel: "Reason (optional)",
    notePlaceholder: "e.g. Trainee requested a change",
    description: (a) => (
      <>
        This ends the active pairing between <strong>{a.customer_name}</strong>{" "}
        and <strong>{a.trainer_name}</strong>. Their chat and calls stop
        working, and the trainee can request a new trainer. Both are notified.
      </>
    ),
    toast: (a) => `${a.trainer_name} unassigned from ${a.customer_name}`,
  },
};

export default function TrainerAssignments() {
  const [filter, setFilter] = useState("pending_admin");
  // One dialog serves all three actions; the target status picks its copy.
  const [target, setTarget] = useState<{
    assignment: TrainerAssignment;
    status: AdminAssignmentAction;
  } | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const queryClient = useQueryClient();

  const { page, pageSize, goToPage, setPageSize, resetPage } = usePagination({
    initialPageSize: 20,
  });

  const { GetTrainerAssignments, UpdateTrainerAssignmentStatus } = useAdmin();
  const { data, isPlaceholderData, isFetching } = GetTrainerAssignments({
    queryParams: { status: filter, page, page_size: pageSize },
  });
  const assignments = data?.items ?? [];
  const total = data?.total ?? 0;

  function handleFilterChange(value: string) {
    setFilter(value);
    resetPage();
  }

  const updateStatus = UpdateTrainerAssignmentStatus();

  function openAction(
    assignment: TrainerAssignment,
    status: AdminAssignmentAction,
  ) {
    setAdminNote("");
    setTarget({ assignment, status });
  }

  async function submitAction() {
    if (!target) return;
    const { assignment, status } = target;
    try {
      await updateStatus.mutateAsync({
        id: assignment.id,
        status,
        admin_note: adminNote || undefined,
      });
      toast.success(ACTION_META[status].toast(assignment));
      setTarget(null);
      // The row's badge and available actions both change, so refetch.
      queryClient.invalidateQueries({ queryKey: ["adminTrainerAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const meta = target ? ACTION_META[target.status] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Review and approve customer–trainer assignments.
        </p>
        <Select value={filter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending_admin">Pending Approval</SelectItem>
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
                <TableHead>Trainer</TableHead>
                <TableHead>Customer Note</TableHead>
                <TableHead>Trainer Note</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            {isFetching ? (
              <TableBodySkeleton columns={7} />
            ) : (
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">{a.customer_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.customer_email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{a.trainer_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.trainer_email}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-sm text-muted-foreground">
                      {a.customer_note ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-sm text-muted-foreground">
                      {a.trainer_note ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE[a.status] ?? ""}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {/* Actions mirror what the API will actually accept:
                          approve only from pending_admin, reject while either
                          side is still pending, unassign only once approved. */}
                      {a.status === "rejected" || a.status === "ended" ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {a.status === "pending_admin" && (
                              <DropdownMenuItem
                                onClick={() => openAction(a, "approved")}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />{" "}
                                Approve
                              </DropdownMenuItem>
                            )}
                            {a.status === "approved" && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => openAction(a, "ended")}
                              >
                                <UserMinus className="h-3.5 w-3.5 mr-1" />
                                Unassign Trainer
                              </DropdownMenuItem>
                            )}
                            {(a.status === "pending_admin" ||
                              a.status === "pending_trainer") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => openAction(a, "rejected")}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!assignments.length && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <UserCheck className="mx-auto mb-2 h-10 w-10 opacity-30" />
                      No assignments found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            )}
          </Table>
        </CardContent>
      </Card>
      {total > 0 && (
        <AppPagination
          page={page}
          total={total}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          onPageChange={goToPage}
        />
      )}
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{meta?.title}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground mb-2">
              {target && meta?.description(target.assignment)}
            </p>
            <div className="flex flex-col gap-2">
              <Label>{meta?.noteLabel}</Label>
              <Input
                placeholder={meta?.notePlaceholder}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={meta?.destructive ? "destructive" : "default"}
              onClick={submitAction}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? meta?.pendingLabel : meta?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
