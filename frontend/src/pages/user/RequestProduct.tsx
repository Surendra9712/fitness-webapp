import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import http from "@/api/client";
import useUser from "@/hooks/useUser";
import { usePagination } from "@/hooks/usePagination";
import { AppPagination } from "@/components/ui/app-pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { toast } from "sonner";
import type { RequestStatus } from "@/types";

const schema = z.object({
  product_name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  reason: z.string().optional(),
  image_url: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const statusIcon: Record<RequestStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  approved: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  rejected: <XCircle className="h-4 w-4 text-destructive" />,
};

const statusVariant: Record<
  RequestStatus,
  "info" | "success" | "destructive"
> = {
  pending: "info",
  approved: "success",
  rejected: "destructive",
};

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await http.post<{ url: string }>("/upload/image", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.url;
}

export default function RequestProduct() {
  const { page, pageSize, goToPage, setPageSize } = usePagination({
    initialPageSize: 10,
  });

  const { GetProductRequests, CreateProductRequest } = useUser();
  const { data: requestsData } = GetProductRequests({
    queryParams: { page, page_size: pageSize },
  });
  const requests = requestsData?.items ?? [];
  const total = requestsData?.total ?? 0;
  const createRequest = CreateProductRequest();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      product_name: "",
      description: "",
      reason: "",
      image_url: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createRequest.mutateAsync({
        product_name: values.product_name,
        description: values.description || undefined,
        reason: values.reason || undefined,
        image_url: values.image_url || undefined,
      });
      toast.success("Request submitted! Admin will review it shortly.");
      form.reset();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Request a Product
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Can't find what you're looking for? Submit a request and our admin
          will review it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Request</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              {/* Product name */}
              <FormField
                control={form.control}
                name="product_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Product Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Whey Protein Isolate"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description — rich text */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Describe the product — ingredients, size, brand, etc."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reason */}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Why do you need it?</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. For post-workout recovery"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Product image */}
              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Image</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        onUpload={uploadImage}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={createRequest.isPending}
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                {createRequest.isPending ? "Submitting…" : "Submit Request"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(requests.length > 0 || total > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              My Requests {total > 0 && `(${total})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.map((r, i) => (
              <div key={r.id}>
                {i > 0 && <Separator className="mb-3" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    {r.image_url && (
                      <img
                        src={r.image_url}
                        alt={r.product_name}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover border"
                      />
                    )}
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        {statusIcon[r.status]}
                        <p className="text-sm font-medium">{r.product_name}</p>
                      </div>
                      {r.description && (
                        <p
                          className="text-xs text-muted-foreground prose prose-xs max-w-none line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: r.description }}
                        />
                      )}
                      {r.reason && (
                        <p className="text-xs text-muted-foreground italic">
                          {r.reason}
                        </p>
                      )}
                      {r.admin_note && (
                        <p className="text-xs italic text-muted-foreground">
                          Admin: {r.admin_note}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={statusVariant[r.status]}
                    className="shrink-0 capitalize"
                  >
                    {r.status}
                  </Badge>
                </div>
              </div>
            ))}
            <AppPagination
              page={page}
              total={total}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              onPageChange={goToPage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
