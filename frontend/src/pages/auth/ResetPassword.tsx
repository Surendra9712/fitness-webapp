import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  TriangleAlert,
} from "lucide-react";
import { api, ApiError } from "@/api/client";
import { endpoint } from "@/api/endpoint";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import AuthShell from "./AuthShell";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(1, "Password is required")
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
type ResetValues = z.infer<typeof resetSchema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [checking, setChecking] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [email, setEmail] = useState("");
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const { isSubmitting } = form.formState;

  // Check the link before showing the form, so an expired one says so up front
  // instead of after the user has typed a password twice.
  useEffect(() => {
    if (!token) {
      setTokenError("This reset link is missing its token.");
      setChecking(false);
      return;
    }
    let cancelled = false;
    api
      .post<{ valid: boolean; email: string }>(endpoint.authVerifyResetToken, {
        token,
      })
      .then((res) => {
        if (!cancelled) setEmail(res.email);
      })
      .catch((err) => {
        if (!cancelled) setTokenError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(values: ResetValues) {
    setServerError("");
    try {
      await api.post(endpoint.authResetPassword, {
        token,
        password: values.password,
      });
      setDone(true);
      // Give the confirmation a moment to register before landing on sign-in.
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        Object.entries(err.fieldErrors).forEach(([field, message]) => {
          if (field === "password" || field === "confirmPassword") {
            form.setError(field, { message });
          } else {
            setServerError(message);
          }
        });
      } else {
        setServerError((err as Error).message);
      }
    }
  }

  if (checking) {
    return (
      <AuthShell title="Reset password" subtitle="Checking your reset link…">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </AuthShell>
    );
  }

  if (tokenError) {
    return (
      <AuthShell
        title="Link no longer valid"
        subtitle="Reset links expire after 60 minutes and work only once"
      >
        <div className="space-y-5">
          <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertDescription>{tokenError}</AlertDescription>
          </Alert>
          <Button
            asChild
            className="w-full bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
            size="lg"
          >
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/login">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
            </Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        title="Password updated"
        subtitle="Your new password is ready to use"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm text-emerald-800">
              Password changed. Taking you to sign in…
            </p>
          </div>
          <Button
            asChild
            className="w-full bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
            size="lg"
          >
            <Link to="/login">Sign in now</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle={email ? `Resetting the password for ${email}` : "Choose a new password"}
    >
      {serverError && (
        <Alert variant="destructive" className="mb-5">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  New password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="pl-10 pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
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

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Confirm new password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="pl-10 pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirm ? (
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

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
            size="lg"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Updating…" : "Update password"}
          </Button>

          <Button asChild variant="ghost" className="w-full">
            <Link to="/login">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
            </Link>
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
