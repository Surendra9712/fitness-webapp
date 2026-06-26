import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Pencil, UserX, UserCheck, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import useAdmin from "@/hooks/useAdmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ConfirmDialog from "@/components/ConfirmDialog";
import { UserModal } from "./UserModal";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/roles";
import type { User, Role } from "@/types";

const roleBadge: Record<Role, "destructive" | "info" | "success"> = {
  admin: "destructive",
  dietitian: "info",
  user: "success",
};

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium capitalize">{String(value).replace(/_/g, " ")}</span>
    </div>
  );
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [modal, setModal] = useState(false);
  const [toggleConfirm, setToggleConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { GetUsers, UpdateUser, DeleteUser } = useAdmin();
  const { data: user, isLoading } = GetUsers({ id: Number(id) });
  const toggleActive = UpdateUser();
  const deleteUser = DeleteUser();

  async function confirmToggle() {
    if (!user) return;
    try {
      const newStatus = user.status === "active" ? "inactive" : "active";
      await toggleActive.mutateAsync({ id: user.id, status: newStatus });
      const label =
        user.status === "active" ? "User disabled"
        : user.status === "pending" ? "User approved"
        : "User enabled";
      toast.success(label);
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setToggleConfirm(false);
    }
  }

  async function confirmDelete() {
    if (!user) return;
    try {
      await deleteUser.mutateAsync(user.id);
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      navigate(-1);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleteConfirm(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        User not found.
      </div>
    );
  }

  const u = user as User & {
    full_name?: string;
    date_of_birth?: string;
    gender?: string;
    activity_level?: string;
    goal?: string;
    weight_kg?: number;
    height_cm?: number;
    bio?: string;
    specialization?: string;
    phone_number?: string;
    city?: string;
    country?: string;
  };

  const initials = u.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">User Detail</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile card */}
        <Card className="md:col-span-1">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-2xl font-bold dark:bg-emerald-900/40 dark:text-emerald-300">
              {initials}
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{u.name}</p>
              <p className="text-sm text-muted-foreground">{u.email}</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <Badge variant={roleBadge[u.role]}>{ROLE_LABELS[u.role]}</Badge>
              {u.status === "pending" ? (
                <Badge variant="warning">Pending</Badge>
              ) : (
                <Badge variant={u.status === "active" ? "success" : "secondary"}>
                  {u.status === "active" ? "Active" : "Disabled"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Joined {new Date(u.created_at!).toLocaleDateString()}
            </p>

            <Separator className="w-full" />

            {/* Action buttons */}
            <div className="flex flex-col gap-2 w-full">
              <Button variant="outline" size="sm" className="w-full" onClick={() => setModal(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setToggleConfirm(true)}
              >
                {u.status === "active" ? (
                  <UserX className="h-4 w-4 mr-2" />
                ) : (
                  <UserCheck className="h-4 w-4 mr-2" />
                )}
                {u.status === "active" ? "Disable" : u.status === "pending" ? "Approve" : "Enable"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info cards */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Account Info</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow label="Full Name" value={u.full_name || u.name} />
              <InfoRow label="Email" value={u.email} />
              <InfoRow label="Role" value={ROLE_LABELS[u.role]} />
              <InfoRow label="Date of Birth" value={u.date_of_birth} />
              <InfoRow label="Phone" value={u.phone_number} />
              <InfoRow label="City" value={u.city} />
              <InfoRow label="Country" value={u.country} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Health & Fitness</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow label="Gender" value={u.gender} />
              <InfoRow label="Weight" value={u.weight_kg ? `${u.weight_kg} kg` : null} />
              <InfoRow label="Height" value={u.height_cm ? `${u.height_cm} cm` : null} />
              <InfoRow label="Goal" value={u.goal} />
              <InfoRow label="Activity Level" value={u.activity_level} />
            </CardContent>
          </Card>

          {(u.bio || u.specialization) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Trainer Info</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                <InfoRow label="Specialization" value={u.specialization} />
                {u.bio && (
                  <div className="py-2">
                    <p className="text-sm text-muted-foreground mb-1">Bio</p>
                    <p className="text-sm">{u.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <UserModal
        user={u as User}
        open={modal}
        onOpenChange={setModal}
      />

      <ConfirmDialog
        open={toggleConfirm}
        onOpenChange={setToggleConfirm}
        title={
          u.status === "active" ? "Disable user?"
          : u.status === "pending" ? "Approve user?"
          : "Enable user?"
        }
        description={
          u.status === "active"
            ? `${u.name} will lose access to the platform.`
            : u.status === "pending"
            ? `${u.name}'s account will be approved and they can log in.`
            : `${u.name} will regain access to the platform.`
        }
        confirmLabel={
          u.status === "active" ? "Disable"
          : u.status === "pending" ? "Approve"
          : "Enable"
        }
        destructive={u.status === "active"}
        onConfirm={confirmToggle}
      />

      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Delete user?"
        description="This will permanently delete the user account. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
