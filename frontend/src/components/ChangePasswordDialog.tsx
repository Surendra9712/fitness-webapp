import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/api/client";
import { endpoint } from "@/api/endpoint";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const schema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z
      .string()
      .min(1, "New password is required")
      .min(6, "Password must be at least 6 characters"),
    confirm_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  })
  .refine((v) => v.new_password !== v.current_password, {
    path: ["new_password"],
    message: "New password must be different from the current one",
  });
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Password change for the signed-in user — same form for every role. */
export default function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const [serverError, setServerError] = useState("");
  const [visible, setVisible] = useState<Record<keyof FormValues, boolean>>({
    current_password: false,
    new_password: false,
    confirm_password: false,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });
  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (open) {
      form.reset();
      setServerError("");
      setVisible({
        current_password: false,
        new_password: false,
        confirm_password: false,
      });
    }
    // form is a stable object from useForm; only `open` should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: FormValues) {
    setServerError("");
    try {
      await api.put(endpoint.authChangePassword, {
        current_password: values.current_password,
        new_password: values.new_password,
      });
      toast.success("Password changed");
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        let mapped = false;
        Object.entries(err.fieldErrors).forEach(([field, message]) => {
          if (field === "current_password" || field === "new_password") {
            form.setError(field, { message });
            mapped = true;
          }
        });
        if (!mapped) setServerError(err.message);
      } else {
        setServerError((err as Error).message);
      }
    }
  }

  const fields = [
    {
      name: "current_password" as const,
      label: "Current password",
      autoComplete: "current-password",
    },
    {
      name: "new_password" as const,
      label: "New password",
      autoComplete: "new-password",
    },
    {
      name: "confirm_password" as const,
      label: "Confirm new password",
      autoComplete: "new-password",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Change Password
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogBody>
              <div className="space-y-4 py-1">
                {serverError && (
                  <Alert variant="destructive">
                    <AlertDescription>{serverError}</AlertDescription>
                  </Alert>
                )}

                {fields.map((f) => (
                  <FormField
                    key={f.name}
                    control={form.control}
                    name={f.name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{f.label}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={visible[f.name] ? "text" : "password"}
                              placeholder="••••••••"
                              autoComplete={f.autoComplete}
                              className="pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setVisible((v) => ({
                                  ...v,
                                  [f.name]: !v[f.name],
                                }))
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                              aria-label={
                                visible[f.name]
                                  ? "Hide password"
                                  : "Show password"
                              }
                            >
                              {visible[f.name] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}

                <p className="text-xs text-muted-foreground">
                  Use at least 6 characters. Changing your password also voids
                  any pending reset link.
                </p>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Saving…" : "Change password"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
