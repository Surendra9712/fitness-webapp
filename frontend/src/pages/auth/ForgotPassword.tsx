import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react";
import { api } from "@/api/client";
import { endpoint } from "@/api/endpoint";
import { ApiError } from "@/api/client";
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
import AuthShell from "./AuthShell";

const forgotSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});
type ForgotValues = z.infer<typeof forgotSchema>;

interface ForgotResponse {
  message: string;
  /** Only present in dev when SMTP is unconfigured — see backend/utils/mailer.py. */
  dev_reset_url?: string;
}

export default function ForgotPassword() {
  const [serverError, setServerError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");

  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });
  const { isSubmitting } = form.formState;

  async function onSubmit(values: ForgotValues) {
    setServerError("");
    try {
      const res = await api.post<ForgotResponse>(endpoint.authForgotPassword, {
        email: values.email,
      });
      setDevResetUrl(res.dev_reset_url ?? "");
      setSentTo(values.email);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        Object.entries(err.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof ForgotValues, { message });
        });
      } else {
        setServerError((err as Error).message);
      }
    }
  }

  if (sentTo) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="We sent you a link to set a new password"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-emerald-900">Sent to {sentTo}</p>
              <p className="text-emerald-700">
                The link expires in 60 minutes and can only be used once. Check
                your spam folder if it does not arrive.
              </p>
            </div>
          </div>

          {devResetUrl && (
            <Alert>
              <AlertDescription className="space-y-1.5 break-all text-xs">
                <span className="block font-semibold">
                  Dev mode: no SMTP configured, so use this link directly.
                </span>
                <Link
                  to={devResetUrl.replace(/^https?:\/\/[^/]+/, "")}
                  className="block font-medium text-emerald-700 underline underline-offset-2"
                >
                  {devResetUrl}
                </Link>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSentTo("");
                setDevResetUrl("");
              }}
            >
              Use a different email
            </Button>
            <Button asChild variant="ghost">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
              </Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link"
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Email address
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="pl-10"
                      {...field}
                    />
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
            {isSubmitting ? "Sending…" : "Send reset link"}
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
