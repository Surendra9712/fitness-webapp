import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  UserX,
  UserCheck,
  Trash2,
  Eye,
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

const roleBadge: Record<Role, "destructive" | "info" | "success"> = {
  admin: "destructive",
  dietitian: "info",
  trainee: "success",
};

type StatusFilter = "all" | "active" | "inactive" | "pending";

const PAGE_TITLES: Record<string, string> = {
  trainee: "Trainee Management",
  dietitian: "Trainer Management",
};

const ENTITY_LABELS: Record<string, string> = {
  trainee: "Trainee",
  dietitian: "Trainer",
};

interface Props {
  role?: "trainee" | "dietitian";
}

export default function UserManagement({ role }: Props) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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
  const { page, goToPage, setPageSize, pageSize } = usePagination({
    initialPageSize: 20,
  });

  const { GetUsers, UpdateUser, DeleteUser } = useAdmin();
  const { data, isPlaceholderData } = GetUsers({
    queryParams: {
      page,
      page_size: pageSize,
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      ...(role ? { role } : {}),
    },
  });
  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const toggleActive = UpdateUser();
  const deleteUser = DeleteUser();

  const title = role ? PAGE_TITLES[role] : "User Management";
  const entityLabel = role ? ENTITY_LABELS[role] : "User";

  function handleTabChange(val: string) {
    setStatusFilter(val as StatusFilter);
    goToPage(1);
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
                  {u.status === "pending" ? (
                    <Badge variant="warning">Pending</Badge>
                  ) : (
                    <Badge
                      variant={u.status === "active" ? "success" : "secondary"}
                    >
                      {u.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  )}
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
                  No {entityLabel.toLowerCase()}s found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <Button onClick={() => setModal({ open: true })}>
          <Plus className="h-4 w-4" />
          Add {entityLabel}
        </Button>
      </div>

      <Tabs value={statusFilter} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
        <TabsContent value={statusFilter}>{tableContent}</TabsContent>
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
