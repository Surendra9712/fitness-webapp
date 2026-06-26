import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import useAdmin from "@/hooks/useAdmin";
import type { User } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().optional(),
  role: z.enum(["trainee", "dietitian", "admin"]),
});

type FormValues = z.infer<typeof schema>;

interface UserModalProps {
  user?: User | null;
  open: boolean;
  onOpenChange: (val: boolean) => void;
  lockedRole?: "trainee" | "dietitian";
  entityLabel?: string;
}

export function UserModal({
  user,
  open,
  onOpenChange,
  lockedRole,
  entityLabel = "User",
}: UserModalProps) {
  const isEdit = !!user;
  const queryClient = useQueryClient();

  const { CreateUser, UpdateUser } = useAdmin();
  const createUser = CreateUser();
  const updateUser = UpdateUser();
  const isPending = isEdit ? updateUser.isPending : createUser.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: lockedRole ?? "trainee",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      user
        ? {
            name: user.name,
            email: user.email,
            password: "",
            role: lockedRole ?? user.role,
          }
        : { name: "", email: "", password: "", role: lockedRole ?? "trainee" },
    );
  }, [open, user, lockedRole]);

  async function onSubmit(values: FormValues) {
    if (!isEdit && !values.password?.trim()) {
      form.setError("password", { message: "Password is required" });
      return;
    }
    try {
      if (isEdit) {
        const { password: _pw, ...rest } = values;
        await updateUser.mutateAsync({ id: user!.id, ...rest });
        toast.success("User updated");
      } else {
        await createUser.mutateAsync(values);
        toast.success("User created");
      }
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit ${entityLabel}` : `Create New ${entityLabel}`}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogBody className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isEdit && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Min 6 characters"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {!lockedRole && (
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="trainee">Trainee</SelectItem>
                          <SelectItem value="dietitian">Trainer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
