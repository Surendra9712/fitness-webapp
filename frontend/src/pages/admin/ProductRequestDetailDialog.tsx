import {
  CalendarDays,
  CheckCircle,
  FileText,
  ImageOff,
  Mail,
  MessageSquareQuote,
  Package,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ProductRequest, RequestStatus } from "@/types";

const statusVariant: Record<RequestStatus, "info" | "success" | "destructive"> =
  {
    pending: "info",
    approved: "success",
    rejected: "destructive",
  };

/**
 * Trainees write `description` with the rich-text editor, so it arrives as HTML.
 * Rendering it through dangerouslySetInnerHTML in an *admin* view would let a
 * trainee run script in an admin session, and no sanitizer is installed — so
 * tags are stripped to text here, keeping paragraph and list breaks as newlines.
 * Entities are decoded last, then handed to React as a text child, which escapes
 * anything that still looks like markup.
 */
export function htmlToText(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </p>
      {children}
    </div>
  );
}

export function ProductRequestDetailDialog({
  request,
  onClose,
  onApprove,
  onReject,
}: {
  request: ProductRequest;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const description = htmlToText(request.description);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Product Request</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Product */}
          <div className="flex items-start gap-3">
            {request.image_url ? (
              <img
                src={request.image_url}
                alt={request.product_name}
                className="h-20 w-20 shrink-0 rounded-lg border object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border bg-muted">
                <ImageOff className="h-6 w-6 text-muted-foreground/50" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-semibold">
                <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{request.product_name}</span>
              </p>
              <div className="mt-1.5">
                <Badge
                  variant={statusVariant[request.status]}
                  className="capitalize"
                >
                  {request.status}
                </Badge>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                Requested {new Date(request.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <Separator />

          <Field icon={User} label="Requested by">
            <p className="text-sm font-medium">{request.user_name ?? "—"}</p>
            {request.user_email && (
              <a
                href={`mailto:${request.user_email}`}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Mail className="h-3 w-3 shrink-0" />
                {request.user_email}
              </a>
            )}
          </Field>

          <Field icon={FileText} label="Description">
            {description ? (
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {description}
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                No description provided
              </p>
            )}
          </Field>

          <Field icon={MessageSquareQuote} label="Reason for request">
            {request.reason ? (
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {request.reason}
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                No reason given
              </p>
            )}
          </Field>

          {/* Review trail — only once someone has acted on it */}
          {(request.admin_note ||
            request.reviewed_at ||
            request.reviewed_by_name) && (
            <>
              <Separator />
              <Field icon={ShieldCheck} label="Review">
                {request.admin_note && (
                  <p className="mb-1 text-sm leading-relaxed">
                    “{request.admin_note}”
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {request.reviewed_by_name
                    ? `Reviewed by ${request.reviewed_by_name}`
                    : "Reviewed"}
                  {request.reviewed_at &&
                    ` on ${new Date(request.reviewed_at).toLocaleString()}`}
                </p>
              </Field>
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {request.status === "pending" && (
            <>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-red-50"
                onClick={onReject}
              >
                <XCircle className="mr-1 h-4 w-4" />
                Reject
              </Button>
              <Button onClick={onApprove}>
                <CheckCircle className="mr-1 h-4 w-4" />
                Approve
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
