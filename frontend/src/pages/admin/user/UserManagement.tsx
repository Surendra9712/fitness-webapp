import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  UserX,
  UserCheck,
  Trash2,
  Eye,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import useAdmin from "@/hooks/useAdmin";
import { usePagination } from "@/hooks/usePagination";
import { AppPagination } from "@/components/ui/app-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { UserModal } from "./UserModal";
import { toast } from "sonner";
import type { User, Role } from "@/types";
import { ROLE_LABELS } from "@/lib/constant";
import { SearchInput } from "@/components/ui/search-input";
import { TableBodySkeleton } from "@/components/TableSkeleton";

const roleBadge: Record<Role, "destructive" | "info" | "success"> = {
  admin: "destructive",
  dietitian: "info",
  trainee: "success",
};

const ENTITY_LABELS: Record<string, string> = {
  trainee: "Trainee",
  dietitian: "Trainer",
};

const TRAINER_REQUEST_TAB = "trainer_pending";

interface Props {
  role?: "trainee" | "dietitian";
}

const STATUS_TABS = [
  "all",
  "active",
  "inactive",
  // "pending",
  TRAINER_REQUEST_TAB,
];

export default function UserManagement({ role }: Props) {
  const navigate = useNavigate();
  // ?tab= lets other pages deep-link straight to a tab (the dashboard's
  // "User Approvals" card links to the trainer-request queue this way).
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") ?? "";
  const initialTab = STATUS_TABS.includes(tabFromUrl) ? tabFromUrl : "all";
  const [filters, setFilters] = useState({
    search: "",
    role,
    status: initialTab,
  });
  const [modal, setModal] = useState<{ open: boolean; user?: User }>({
    open: false,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: number | null;
  }>({ open: false, id: null });
  const [toggleConfirm, setToggleConfirm] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });

  const queryClient = useQueryClient();
  const { page, goToPage, setPageSize, pageSize, resetPage } = usePagination({
    initialPageSize: 20,
  });

  const {
    GetUsers,
    UpdateUser,
    DeleteUser,
    VerifyTrainer,
    RejectTrainerRequest,
  } = useAdmin();
  const verifyTrainer = VerifyTrainer();
  const rejectTrainerRequest = RejectTrainerRequest();

  // The "Trainer requests" tab filters on trainer_request_status; every other
  // tab filters on the account status. They are separate columns, so only one
  // of the two params is ever sent.
  const isTrainerRequestTab = filters.status === TRAINER_REQUEST_TAB;
  const { data, isPlaceholderData, isFetching } = GetUsers({
    queryParams: {
      page,
      page_size: pageSize,
      ...(isTrainerRequestTab
        ? { trainer_request_status: "pending" }
        : filters.status !== "all" && { status: filters.status }),
      ...(filters.role && { role: filters.role }),
      ...(filters.search && { search: filters.search }),
    },
  });

  useEffect(() => {
    resetPage();
    setFilters({ status: initialTab, search: "", role });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, initialTab]);

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const toggleActive = UpdateUser();
  const deleteUser = DeleteUser();

  const entityLabel = role ? ENTITY_LABELS[role] : "User";

  function handleTabChange(val: string) {
    setFilters((prev) => ({ ...prev, status: val, search: "" }));
    goToPage(1);
    const next = new URLSearchParams(searchParams);
    if (val === "all") next.delete("tab");
    else next.set("tab", val);
    setSearchParams(next, { replace: true });
  }

  async function confirmToggle() {
    const u = toggleConfirm.user;
    if (!u) return;
    try {
      const newStatus = u.status === "active" ? "inactive" : "active";
      await toggleActive.mutateAsync({ id: u.id, status: newStatus });
      const label =
        u.status === "active"
          ? "User disabled"
          : u.status === "pending"
            ? "User approved"
            : "User enabled";
      toast.success(label);
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setToggleConfirm({ open: false, user: null });
    }
  }

  async function confirmDelete() {
    const id = deleteConfirm.id;
    if (!id) return;
    try {
      await deleteUser.mutateAsync(id);
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleteConfirm({ open: false, id: null });
    }
  }

  async function handleApproveRequest(u: User) {
    try {
      await verifyTrainer.mutateAsync(u.id);
      toast.success(`${u.name} approved as a trainer`);
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleRejectRequest(u: User) {
    try {
      await rejectTrainerRequest.mutateAsync({ uid: u.id });
      toast.success(`${u.name}'s trainer request declined`);
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    goToPage(1);
  };

  const tableContent = (
    <Card className={isPlaceholderData ? "opacity-70" : ""}>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              {!role && <TableHead>Role</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {isFetching ? (
            <TableBodySkeleton columns={5} />
          ) : (
            <TableBody>
              {users.map((u: User) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email}
                  </TableCell>
                  {!role && (
                    <TableCell>
                      <Badge variant={roleBadge[u.role]}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {u.status === "pending" ? (
                        <Badge variant="warning">Pending</Badge>
                      ) : (
                        <Badge
                          variant={
                            u.status === "active" ? "success" : "secondary"
                          }
                        >
                          {u.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      )}
                      {u.trainer_request_status === "pending" && (
                        <Badge variant="warning">Trainer request</Badge>
                      )}
                      {u.trainer_request_status === "rejected" && (
                        <Badge variant="secondary">Request declined</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(u.created_at!).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate(`/admin/users/${u.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setModal({ open: true, user: u })}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setToggleConfirm({ open: true, user: u })
                          }
                        >
                          {u.status === "active" ? (
                            <UserX className="h-4 w-4 mr-2" />
                          ) : (
                            <UserCheck className="h-4 w-4 mr-2" />
                          )}
                          {u.status === "active"
                            ? "Disable"
                            : u.status === "pending"
                              ? "Approve"
                              : "Enable"}
                        </DropdownMenuItem>
                        {u.trainer_request_status === "pending" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleApproveRequest(u)}
                            >
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              Approve trainer request
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRejectRequest(u)}
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Decline trainer request
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() =>
                            setDeleteConfirm({ open: true, id: u.id })
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!users.length && (
                <TableRow>
                  <TableCell
                    colSpan={role ? 5 : 6}
                    className="text-center text-muted-foreground py-8"
                  >
                    {isTrainerRequestTab
                      ? "No trainer requests pending"
                      : `No ${entityLabel.toLowerCase()}s found`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          )}
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {/* <h1 className="text-2xl font-bold tracking-tight">{title}</h1> */}
      </div>

      <Tabs value={filters?.status} onValueChange={handleTabChange}>
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
            {/* <TabsTrigger value="pending">Pending</TabsTrigger> */}
            <TabsTrigger value={TRAINER_REQUEST_TAB}>
              Trainer requests
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => setModal({ open: true })}>
            <Plus className="h-4 w-4" />
            Add {entityLabel}
          </Button>
        </div>
        <div className="py-4 max-w-md">
          <SearchInput
            value={filters.search}
            onSearch={handleSearch}
            placeholder="Search users..."
          />
        </div>

        <TabsContent value={filters.status}>{tableContent}</TabsContent>
      </Tabs>

      <AppPagination
        page={page}
        total={total}
        onPageSizeChange={setPageSize}
        pageSize={pageSize}
        onPageChange={goToPage}
      />

      <UserModal
        user={modal.user}
        open={modal.open}
        onOpenChange={(o) => setModal((m) => ({ ...m, open: o }))}
        lockedRole={role}
        entityLabel={entityLabel}
      />

      <ConfirmDialog
        open={toggleConfirm.open}
        onOpenChange={(o) => setToggleConfirm((s) => ({ ...s, open: o }))}
        title={
          toggleConfirm.user?.status === "active"
            ? "Disable user?"
            : toggleConfirm.user?.status === "pending"
              ? "Approve user?"
              : "Enable user?"
        }
        description={
          toggleConfirm.user?.status === "active"
            ? `${toggleConfirm.user.name} will lose access to the platform.`
            : toggleConfirm.user?.status === "pending"
              ? `${toggleConfirm.user?.name}'s account will be approved and they can log in.`
              : `${toggleConfirm.user?.name} will regain access to the platform.`
        }
        confirmLabel={
          toggleConfirm.user?.status === "active"
            ? "Disable"
            : toggleConfirm.user?.status === "pending"
              ? "Approve"
              : "Enable"
        }
        destructive={toggleConfirm.user?.status === "active"}
        onConfirm={confirmToggle}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(o) => setDeleteConfirm((s) => ({ ...s, open: o }))}
        title="Delete user?"
        description="This will permanently delete the user account. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
